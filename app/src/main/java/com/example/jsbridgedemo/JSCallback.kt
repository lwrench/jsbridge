package com.example.jsbridgedemo

import org.json.JSONObject

interface JSCallback {
    fun success(data: Any?)
    fun error(message: String)
}

class JSCallbackImpl(
    private val callbackId: String,
    private val jsBridge: JSBridge
) : JSCallback {
    
    override fun success(data: Any?) {
        val response = JSONObject().apply {
            put("id", callbackId)
            put("success", true)
            put("data", data)
        }
        jsBridge.sendResponse(response)
    }
    
    override fun error(message: String) {
        val response = JSONObject().apply {
            put("id", callbackId)
            put("success", false)
            put("error", message)
        }
        jsBridge.sendResponse(response)
    }
}