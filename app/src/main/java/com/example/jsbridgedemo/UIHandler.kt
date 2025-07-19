package com.example.jsbridgedemo

import android.content.Context
import android.widget.Toast
import org.json.JSONObject

class UIHandler(private val context: Context) : MessageHandler {
    
    override fun handle(method: String, params: JSONObject, callback: JSCallback) {
        when (method) {
            "showToast" -> showToast(params, callback)
            "vibrate" -> vibrate(params, callback)
            else -> callback.error("Unknown UI method: $method")
        }
    }
    
    private fun showToast(params: JSONObject, callback: JSCallback) {
        try {
            val message = params.optString("message", "")
            val duration = if (params.optBoolean("long", false)) {
                Toast.LENGTH_LONG
            } else {
                Toast.LENGTH_SHORT
            }
            
            Toast.makeText(context, message, duration).show()
            callback.success("Toast shown")
        } catch (e: Exception) {
            callback.error("Failed to show toast: ${e.message}")
        }
    }
    
    private fun vibrate(params: JSONObject, callback: JSCallback) {
        try {
            val duration = params.optLong("duration", 200L)
            
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                vibrator.vibrate(android.os.VibrationEffect.createOneShot(duration, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(duration)
            }
            
            callback.success("Vibration completed")
        } catch (e: Exception) {
            callback.error("Failed to vibrate: ${e.message}")
        }
    }
}