package com.example.jsbridgedemo.offline

import android.util.Log
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

class OfflineWebViewClient(
    private val offlinePackageManager: OfflinePackageManager?
) : WebViewClient() {
    
    companion object {
        private const val TAG = "OfflineWebViewClient"
        
        private val MIME_TYPE_MAP = mapOf(
            "html" to "text/html",
            "htm" to "text/html",
            "css" to "text/css",
            "js" to "application/javascript",
            "json" to "application/json",
            "png" to "image/png",
            "jpg" to "image/jpeg",
            "jpeg" to "image/jpeg",
            "gif" to "image/gif",
            "svg" to "image/svg+xml",
            "ico" to "image/x-icon",
            "woff" to "font/woff",
            "woff2" to "font/woff2",
            "ttf" to "font/ttf",
            "eot" to "application/vnd.ms-fontobject"
        )
        
        private val INTERCEPT_RULES = mapOf(
            "html" to InterceptType.LOCAL_FIRST,
            "htm" to InterceptType.LOCAL_FIRST,
            "css" to InterceptType.LOCAL_FIRST,
            "js" to InterceptType.LOCAL_FIRST,
            "png" to InterceptType.LOCAL_ONLY,
            "jpg" to InterceptType.LOCAL_ONLY,
            "jpeg" to InterceptType.LOCAL_ONLY,
            "gif" to InterceptType.LOCAL_ONLY,
            "svg" to InterceptType.LOCAL_FIRST,
            "ico" to InterceptType.LOCAL_FIRST,
            "woff" to InterceptType.LOCAL_ONLY,
            "woff2" to InterceptType.LOCAL_ONLY,
            "ttf" to InterceptType.LOCAL_ONLY
        )
    }
    
    override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
        val url = request?.url?.toString() ?: return null
        
        Log.d(TAG, "Intercepting request: $url")
        
        // Skip interception for certain URLs
        if (shouldSkipInterception(url)) {
            Log.d(TAG, "Skipping interception for: $url")
            return null
        }
        
        val fileExtension = getFileExtension(url)
        val interceptType = INTERCEPT_RULES[fileExtension] ?: InterceptType.NETWORK_FIRST
        
        return when (interceptType) {
            InterceptType.LOCAL_ONLY -> {
                getLocalResource(url)
            }
            InterceptType.LOCAL_FIRST -> {
                getLocalResource(url) ?: getNetworkResource(url)
            }
            InterceptType.NETWORK_FIRST -> {
                getNetworkResource(url) ?: getLocalResource(url)
            }
            InterceptType.NETWORK_ONLY -> {
                null // Let WebView handle network request
            }
        }
    }
    
    private fun shouldSkipInterception(url: String): Boolean {
        return url.startsWith("data:") ||
                url.startsWith("blob:") ||
                url.contains("/api/") ||
                url.contains("analytics") ||
                url.contains("tracking") ||
                url.contains("ads") ||
                url.contains("socket.io")
    }
    
    private fun getLocalResource(url: String): WebResourceResponse? {
        return try {
            val resourceFile = offlinePackageManager?.getResource(url)
            if (resourceFile != null && resourceFile.exists()) {
                Log.d(TAG, "Serving local resource: ${resourceFile.absolutePath}")
                createWebResourceResponse(resourceFile, url)
            } else {
                Log.d(TAG, "Local resource not found: $url")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting local resource: $url", e)
            null
        }
    }
    
    private fun getNetworkResource(url: String): WebResourceResponse? {
        // Let WebView handle network requests by returning null
        Log.d(TAG, "Fallback to network for: $url")
        return null
    }
    
    private fun createWebResourceResponse(file: File, url: String): WebResourceResponse {
        val mimeType = getMimeType(url)
        val encoding = if (isTextFile(mimeType)) "UTF-8" else null
        val inputStream: InputStream = FileInputStream(file)
        
        return WebResourceResponse(mimeType, encoding, inputStream).apply {
            // Set cache headers for better performance
            responseHeaders = mapOf(
                "Cache-Control" to "max-age=31536000", // 1 year
                "Last-Modified" to java.util.Date(file.lastModified()).toString(),
                "ETag" to "\"${file.lastModified()}-${file.length()}\"",
                "Content-Length" to file.length().toString()
            )
        }
    }
    
    private fun getMimeType(url: String): String {
        val extension = getFileExtension(url)
        return MIME_TYPE_MAP[extension] ?: "application/octet-stream"
    }
    
    private fun getFileExtension(url: String): String {
        return try {
            val path = android.net.Uri.parse(url).path ?: url
            val lastDot = path.lastIndexOf('.')
            if (lastDot >= 0 && lastDot < path.length - 1) {
                path.substring(lastDot + 1).lowercase()
            } else {
                ""
            }
        } catch (e: Exception) {
            ""
        }
    }
    
    private fun isTextFile(mimeType: String): Boolean {
        return mimeType.startsWith("text/") ||
                mimeType == "application/javascript" ||
                mimeType == "application/json" ||
                mimeType == "image/svg+xml"
    }
    
    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        Log.d(TAG, "Page finished loading: $url")
        
        // Inject offline package status into page
        injectOfflineStatus(view)
    }
    
    private fun injectOfflineStatus(view: WebView?) {
        view?.evaluateJavascript("""
            (function() {
                if (window.OfflinePackageStatus) return;
                
                window.OfflinePackageStatus = {
                    isOfflineMode: true,
                    version: 'unknown',
                    lastUpdate: 'unknown'
                };
                
                // Dispatch event to notify page
                if (typeof(Event) === 'function') {
                    window.dispatchEvent(new Event('offlinepackageready'));
                } else {
                    // Fallback for older browsers
                    var event = document.createEvent('Event');
                    event.initEvent('offlinepackageready', true, true);
                    window.dispatchEvent(event);
                }
                
                console.log('Offline package status injected');
            })();
        """.trimIndent()) { result ->
            Log.d(TAG, "Offline status injection result: $result")
        }
    }
}

class ResourceInterceptor(private val offlinePackageManager: OfflinePackageManager?) {
    
    companion object {
        private const val TAG = "ResourceInterceptor"
    }
    
    fun interceptRequest(url: String): WebResourceResponse? {
        return try {
            val resourceFile = offlinePackageManager?.getResource(url)
            if (resourceFile != null && resourceFile.exists()) {
                Log.d(TAG, "Intercepted resource: $url -> ${resourceFile.absolutePath}")
                createResponse(resourceFile, url)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error intercepting resource: $url", e)
            null
        }
    }
    
    private fun createResponse(file: File, url: String): WebResourceResponse {
        val mimeType = getMimeType(url)
        val encoding = if (isTextFile(mimeType)) "UTF-8" else null
        val inputStream = FileInputStream(file)
        
        return WebResourceResponse(mimeType, encoding, inputStream)
    }
    
    private fun getMimeType(url: String): String {
        val extension = getFileExtension(url)
        return mapOf(
            "html" to "text/html",
            "css" to "text/css",
            "js" to "application/javascript",
            "json" to "application/json",
            "png" to "image/png",
            "jpg" to "image/jpeg",
            "gif" to "image/gif"
        )[extension] ?: "application/octet-stream"
    }
    
    private fun getFileExtension(url: String): String {
        return try {
            val path = android.net.Uri.parse(url).path ?: url
            val lastDot = path.lastIndexOf('.')
            if (lastDot >= 0 && lastDot < path.length - 1) {
                path.substring(lastDot + 1).lowercase()
            } else {
                ""
            }
        } catch (e: Exception) {
            ""
        }
    }
    
    private fun isTextFile(mimeType: String): Boolean {
        return mimeType.startsWith("text/") ||
                mimeType == "application/javascript" ||
                mimeType == "application/json"
    }
}