package com.example.jsbridgedemo

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

class JSBridge(private val webView: WebView) {
    
    companion object {
        private const val TAG = "JSBridge"
        private const val JS_CALLBACK_PREFIX = "javascript:window.JSBridge._handleCallback"
    }
    
    private val handlers = ConcurrentHashMap<String, MessageHandler>()
    private val callbackManager = CallbackManager()
    private val mainHandler = Handler(Looper.getMainLooper())
    
    init {
        setupWebView()
        registerDefaultHandlers()
    }
    
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
        }
        
        webView.addJavascriptInterface(this, "AndroidBridge")
    }
    
    private fun registerDefaultHandlers() {
        registerHandler("ping") { params: JSONObject, callback: JSCallback ->
            callback.success("pong")
        }
    }
    
    fun registerHandler(method: String, handler: MessageHandler) {
        handlers[method] = handler
        Log.d(TAG, "Registered handler for method: $method")
    }
    
    fun registerHandler(method: String, handler: (JSONObject, JSCallback) -> Unit) {
        registerHandler(method, object : MessageHandler {
            override fun handle(method: String, params: JSONObject, callback: JSCallback) {
                handler(params, callback)
            }
        })
    }
    
    @JavascriptInterface
    fun call(method: String, paramsJson: String, callbackId: String) {
        Log.d(TAG, "Received call: method=$method, params=$paramsJson, callbackId=$callbackId")
        
        try {
            val params = if (paramsJson.isNotEmpty()) {
                JSONObject(paramsJson)
            } else {
                JSONObject()
            }
            
            val handler = handlers[method]
            if (handler != null) {
                val callback = JSCallbackImpl(callbackId, this)
                handler.handle(method, params, callback)
            } else {
                val errorResponse = JSONObject().apply {
                    put("id", callbackId)
                    put("success", false)
                    put("error", "Method '$method' not found")
                }
                sendResponse(errorResponse)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing call", e)
            val errorResponse = JSONObject().apply {
                put("id", callbackId)
                put("success", false)
                put("error", "Internal error: ${e.message}")
            }
            sendResponse(errorResponse)
        }
    }
    
    @JavascriptInterface
    fun callSync(method: String, paramsJson: String): String {
        Log.d(TAG, "Received sync call: method=$method, params=$paramsJson")
        
        try {
            val params = if (paramsJson.isNotEmpty()) {
                JSONObject(paramsJson)
            } else {
                JSONObject()
            }
            
            // For sync calls, we only support simple handlers
            return when (method) {
                "ping" -> JSONObject().apply {
                    put("success", true)
                    put("data", "pong")
                }.toString()
                else -> JSONObject().apply {
                    put("success", false)
                    put("error", "Sync method '$method' not supported")
                }.toString()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing sync call", e)
            return JSONObject().apply {
                put("success", false)
                put("error", "Internal error: ${e.message}")
            }.toString()
        }
    }
    
    fun sendResponse(response: JSONObject) {
        mainHandler.post {
            val script = "$JS_CALLBACK_PREFIX('${response}')"
            webView.evaluateJavascript(script) { result ->
                Log.d(TAG, "Callback executed with result: $result")
            }
        }
    }
    
    fun sendEvent(eventName: String, data: Any?) {
        mainHandler.post {
            val eventData = JSONObject().apply {
                put("event", eventName)
                put("data", data)
            }
            val script = "javascript:window.JSBridge._handleEvent('$eventData')"
            webView.evaluateJavascript(script) { result ->
                Log.d(TAG, "Event sent: $eventName, result: $result")
            }
        }
    }
    
    fun destroy() {
        handlers.clear()
        callbackManager.clearAllCallbacks()
    }
}