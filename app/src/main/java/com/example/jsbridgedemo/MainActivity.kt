package com.example.jsbridgedemo

import android.os.Bundle
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
import com.example.jsbridgedemo.ui.theme.JsBridgeDemoTheme

class MainActivity : ComponentActivity() {
    
    private lateinit var jsBridge: JSBridge
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
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
    
    private fun setupJSBridge(webView: WebView) {
        jsBridge = JSBridge(webView)
        
        // Register handlers
        val deviceInfoHandler = DeviceInfoHandler(this)
        jsBridge.registerHandler("getDeviceInfo", deviceInfoHandler)
        jsBridge.registerHandler("getSystemInfo", deviceInfoHandler)
        jsBridge.registerHandler("getAppInfo", deviceInfoHandler)
        
        val uiHandler = UIHandler(this)
        jsBridge.registerHandler("showToast", uiHandler)
        jsBridge.registerHandler("vibrate", uiHandler)
        
        // Load test page
        webView.loadUrl("file:///android_asset/test.html")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (::jsBridge.isInitialized) {
            jsBridge.destroy()
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