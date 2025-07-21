package com.example.jsbridgedemo

import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.lifecycleScope
import com.example.jsbridgedemo.offline.*
import com.example.jsbridgedemo.ui.theme.JsBridgeDemoTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    
    companion object {
        private const val TAG = "MainActivity"
    }
    
    private lateinit var jsBridge: JSBridge
    private lateinit var offlinePackageManager: OfflinePackageManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        initializeOfflinePackageManager()
        
        setContent {
            JsBridgeDemoTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    WebViewContent(
                        modifier = Modifier.padding(innerPadding)
                    ) { webView ->
                        setupJSBridge(webView)
                    }
                }
            }
        }
    }
    
    private fun initializeOfflinePackageManager() {
        // Initialize offline package manager
        offlinePackageManager = OfflinePackageManager.Builder()
            .setContext(this)
            .setPackageId("com.example.webapp")
            .setDownloadUrl("https://api.offline-packages.example.com/v1/")
            .setMaxCacheSize(100 * 1024 * 1024) // 100MB
            .build()
        
        offlinePackageManager.initialize()
        
        // Check for updates on startup
        lifecycleScope.launch {
            checkForOfflineUpdates()
        }
    }
    
    private suspend fun checkForOfflineUpdates() {
        Log.d(TAG, "Checking for offline package updates...")
        
        offlinePackageManager.checkForUpdates { result ->
            when (result) {
                is UpdateResult.Available -> {
                    Log.d(TAG, "Update available: ${result.updateInfo.latestVersion}")
                    downloadOfflineUpdate(result.updateInfo)
                }
                is UpdateResult.UpToDate -> {
                    Log.d(TAG, "Offline package is up to date")
                }
                is UpdateResult.Error -> {
                    Log.e(TAG, "Failed to check for updates", result.exception)
                }
            }
        }
    }
    
    private fun downloadOfflineUpdate(updateInfo: UpdateInfo) {
        lifecycleScope.launch {
            Log.d(TAG, "Starting offline package download...")
            
            offlinePackageManager.downloadUpdate(updateInfo) { result ->
                when (result) {
                    is DownloadResult.Progress -> {
                        Log.d(TAG, "Download progress: ${result.progress}%")
                    }
                    is DownloadResult.Success -> {
                        Log.d(TAG, "Offline package download completed successfully")
                    }
                    is DownloadResult.Error -> {
                        Log.e(TAG, "Download failed", result.exception)
                    }
                }
            }
        }
    }
    
    private fun setupJSBridge(webView: WebView) {
        // Set up offline-aware WebView client
        webView.webViewClient = OfflineWebViewClient(offlinePackageManager)
        
        // Initialize JSBridge
        jsBridge = JSBridge(webView)
        
        // Register existing handlers
        val deviceInfoHandler = DeviceInfoHandler(this)
        jsBridge.registerHandler("getDeviceInfo", deviceInfoHandler)
        jsBridge.registerHandler("getSystemInfo", deviceInfoHandler)
        jsBridge.registerHandler("getAppInfo", deviceInfoHandler)
        
        val uiHandler = UIHandler(this)
        jsBridge.registerHandler("showToast", uiHandler)
        jsBridge.registerHandler("vibrate", uiHandler)
        
        // Register offline package handlers
        registerOfflinePackageHandlers()
        
        // Load test page (will be intercepted by offline package manager if available)
        webView.loadUrl("file:///android_asset/test.html")
    }
    
    private fun registerOfflinePackageHandlers() {
        // Check offline update handler
        jsBridge.registerHandler("checkOfflineUpdate") { params, callback ->
            lifecycleScope.launch {
                try {
                    offlinePackageManager.checkForUpdates { result ->
                        when (result) {
                            is UpdateResult.Available -> {
                                callback.success(mapOf(
                                    "hasUpdate" to true,
                                    "latestVersion" to result.updateInfo.latestVersion,
                                    "currentVersion" to (offlinePackageManager.getResource("manifest.json")?.let { 
                                        // Read current version from manifest
                                        "unknown"
                                    } ?: "none"),
                                    "size" to result.updateInfo.size,
                                    "description" to result.updateInfo.description
                                ))
                            }
                            is UpdateResult.UpToDate -> {
                                callback.success(mapOf(
                                    "hasUpdate" to false,
                                    "message" to "Up to date"
                                ))
                            }
                            is UpdateResult.Error -> {
                                callback.error("Failed to check for updates: ${result.exception.message}")
                            }
                        }
                    }
                } catch (e: Exception) {
                    callback.error("Error checking for updates: ${e.message}")
                }
            }
        }
        
        // Download offline update handler
        jsBridge.registerHandler("downloadOfflineUpdate") { params, callback ->
            // This would typically be triggered by user action
            callback.success("Download will be handled automatically")
        }
        
        // Get offline package status handler
        jsBridge.registerHandler("getOfflinePackageStatus") { params, callback ->
            try {
                val hasOfflinePackage = offlinePackageManager.getResource("manifest.json") != null
                callback.success(mapOf(
                    "isOfflineMode" to hasOfflinePackage,
                    "version" to if (hasOfflinePackage) "1.0.0" else "none",
                    "lastUpdate" to System.currentTimeMillis()
                ))
            } catch (e: Exception) {
                callback.error("Failed to get offline status: ${e.message}")
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (::jsBridge.isInitialized) {
            jsBridge.destroy()
        }
        if (::offlinePackageManager.isInitialized) {
            offlinePackageManager.destroy()
        }
    }
}

@Composable
fun WebViewContent(
    modifier: Modifier = Modifier,
    onWebViewCreated: (WebView) -> Unit
) {
    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                onWebViewCreated(this)
            }
        }
    )
}