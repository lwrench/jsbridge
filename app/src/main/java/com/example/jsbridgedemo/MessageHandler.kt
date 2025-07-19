package com.example.jsbridgedemo

import org.json.JSONObject

interface MessageHandler {
    fun handle(method: String, params: JSONObject, callback: JSCallback)
}