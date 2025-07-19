package com.example.jsbridgedemo

import android.content.Context
import android.os.Build
import android.provider.Settings
import org.json.JSONObject

class DeviceInfoHandler(private val context: Context) : MessageHandler {
    
    override fun handle(method: String, params: JSONObject, callback: JSCallback) {
        when (method) {
            "getDeviceInfo" -> getDeviceInfo(callback)
            "getSystemInfo" -> getSystemInfo(callback)
            "getAppInfo" -> getAppInfo(callback)
            else -> callback.error("Unknown device info method: $method")
        }
    }
    
    private fun getDeviceInfo(callback: JSCallback) {
        try {
            val deviceInfo = JSONObject().apply {
                put("brand", Build.BRAND)
                put("model", Build.MODEL)
                put("manufacturer", Build.MANUFACTURER)
                put("device", Build.DEVICE)
                put("product", Build.PRODUCT)
                put("androidId", Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID))
            }
            callback.success(deviceInfo)
        } catch (e: Exception) {
            callback.error("Failed to get device info: ${e.message}")
        }
    }
    
    private fun getSystemInfo(callback: JSCallback) {
        try {
            val systemInfo = JSONObject().apply {
                put("sdkVersion", Build.VERSION.SDK_INT)
                put("release", Build.VERSION.RELEASE)
                put("codename", Build.VERSION.CODENAME)
                put("incremental", Build.VERSION.INCREMENTAL)
                put("board", Build.BOARD)
                put("hardware", Build.HARDWARE)
            }
            callback.success(systemInfo)
        } catch (e: Exception) {
            callback.error("Failed to get system info: ${e.message}")
        }
    }
    
    private fun getAppInfo(callback: JSCallback) {
        try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val appInfo = JSONObject().apply {
                put("packageName", context.packageName)
                put("versionName", packageInfo.versionName)
                put("versionCode", packageInfo.longVersionCode)
                put("appName", context.applicationInfo.loadLabel(context.packageManager).toString())
            }
            callback.success(appInfo)
        } catch (e: Exception) {
            callback.error("Failed to get app info: ${e.message}")
        }
    }
}