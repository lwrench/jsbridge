package com.example.jsbridgedemo

import android.os.Handler
import android.os.Looper
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

class CallbackManager {
    private val callbacks = ConcurrentHashMap<String, JSCallback>()
    private val idGenerator = AtomicLong(0)
    private val mainHandler = Handler(Looper.getMainLooper())
    private val timeoutDuration = 30000L // 30 seconds
    
    fun generateCallbackId(): String {
        return "callback_${idGenerator.incrementAndGet()}"
    }
    
    fun registerCallback(callbackId: String, callback: JSCallback) {
        callbacks[callbackId] = callback
        
        // Set timeout for callback
        mainHandler.postDelayed({
            val timeoutCallback = callbacks.remove(callbackId)
            timeoutCallback?.error("Callback timeout")
        }, timeoutDuration)
    }
    
    fun executeCallback(callbackId: String, success: Boolean, data: Any?, error: String?) {
        val callback = callbacks.remove(callbackId)
        callback?.let {
            if (success) {
                it.success(data)
            } else {
                it.error(error ?: "Unknown error")
            }
        }
    }
    
    fun removeCallback(callbackId: String) {
        callbacks.remove(callbackId)
    }
    
    fun clearAllCallbacks() {
        callbacks.clear()
    }
}