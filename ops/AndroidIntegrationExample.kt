/**
 * Android 应用中集成离线包管理平台的示例代码
 * 展示如何在现有的 JsBridgeDemo 项目中集成离线包功能
 */

package com.example.jsbridgedemo.integration

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * 离线包管理平台集成客户端
 * 与我们搭建的离线包管理平台进行交互
 */
class OfflinePackageClient(
    private val context: Context,
    private val baseUrl: String = "http://your-server.com/api/v1"
) {
    
    /**
     * 检查是否有新版本的离线包
     * @param packageId 包ID，如 "com.example.webapp"
     * @param currentVersion 当前版本，如 "1.0.0"
     * @return UpdateInfo 更新信息，如果没有更新则 hasUpdate 为 false
     */
    suspend fun checkForUpdates(packageId: String, currentVersion: String): UpdateInfo {
        return withContext(Dispatchers.IO) {
            val url = "$baseUrl/packages/check-version?packageId=$packageId&currentVersion=$currentVersion"
            
            val connection = URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.setRequestProperty("Accept", "application/json")
            
            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                parseUpdateResponse(response)
            } else {
                throw Exception("HTTP Error: $responseCode")
            }
        }
    }
    
    /**
     * 下载离线包文件
     * @param packageId 包ID
     * @param version 版本号
     * @param outputFile 输出文件
     * @return Boolean 是否下载成功
     */
    suspend fun downloadPackage(packageId: String, version: String, outputFile: File): Boolean {
        return withContext(Dispatchers.IO) {
            val url = "$baseUrl/packages/$packageId/$version/download"
            
            try {
                val connection = URL(url).openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                
                if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                    connection.inputStream.use { input ->
                        outputFile.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                    true
                } else {
                    false
                }
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }
    
    /**
     * 获取包的详细信息
     */
    suspend fun getPackageInfo(packageId: String, version: String): PackageInfo? {
        return withContext(Dispatchers.IO) {
            val url = "$baseUrl/packages/$packageId/$version/info"
            
            try {
                val connection = URL(url).openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                
                if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    parsePackageInfoResponse(response)
                } else {
                    null
                }
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }
    }
    
    private fun parseUpdateResponse(response: String): UpdateInfo {
        val json = JSONObject(response)
        val data = json.getJSONObject("data")
        
        return UpdateInfo(
            hasUpdate = data.getBoolean("hasUpdate"),
            latestVersion = data.getString("latestVersion"),
            downloadUrl = data.getString("downloadUrl"),
            size = data.getLong("size"),
            forceUpdate = data.getBoolean("forceUpdate"),
            releaseNotes = data.getJSONObject("updateInfo").getString("releaseNotes")
        )
    }
    
    private fun parsePackageInfoResponse(response: String): PackageInfo {
        val json = JSONObject(response)
        val data = json.getJSONObject("data")
        
        return PackageInfo(
            packageId = data.getString("packageId"),
            version = data.getString("version"),
            downloadUrl = data.getString("downloadUrl"),
            size = data.getLong("size"),
            checksum = data.getString("checksum"),
            publishTime = data.getString("publishTime")
        )
    }
}

/**
 * 更新信息数据类
 */
data class UpdateInfo(
    val hasUpdate: Boolean,
    val latestVersion: String,
    val downloadUrl: String,
    val size: Long,
    val forceUpdate: Boolean,
    val releaseNotes: String
)

/**
 * 包信息数据类  
 */
data class PackageInfo(
    val packageId: String,
    val version: String,
    val downloadUrl: String,
    val size: Long,
    val checksum: String,
    val publishTime: String
)

/**
 * 在 MainActivity 中的使用示例
 * 
 * 将此代码集成到现有的 MainActivity.kt 中
 */
class MainActivityIntegration {
    
    private val offlinePackageClient = OfflinePackageClient(this)
    
    /**
     * 在 onCreate 中调用此方法检查更新
     */
    private fun checkOfflinePackageUpdates() {
        lifecycleScope.launch {
            try {
                // 检查 webapp 离线包更新
                val currentVersion = getLocalPackageVersion("com.example.webapp")
                val updateInfo = offlinePackageClient.checkForUpdates("com.example.webapp", currentVersion)
                
                if (updateInfo.hasUpdate) {
                    if (updateInfo.forceUpdate) {
                        // 强制更新
                        downloadAndUpdatePackage("com.example.webapp", updateInfo.latestVersion)
                    } else {
                        // 询问用户是否更新
                        showUpdateDialog(updateInfo)
                    }
                }
            } catch (e: Exception) {
                // 处理网络错误等异常情况
                Log.e("OfflinePackage", "检查更新失败", e)
            }
        }
    }
    
    /**
     * 下载并更新离线包
     */
    private suspend fun downloadAndUpdatePackage(packageId: String, version: String) {
        withContext(Dispatchers.Main) {
            // 显示下载进度
            showDownloadProgress()
        }
        
        // 创建临时文件
        val tempFile = File(cacheDir, "${packageId}_${version}.zip")
        
        // 下载文件
        val success = offlinePackageClient.downloadPackage(packageId, version, tempFile)
        
        if (success) {
            // 解压到指定目录
            val extractDir = File(filesDir, "offline_packages/$packageId/$version")
            ZipUtils.unzip(tempFile, extractDir)
            
            // 更新本地版本记录
            saveLocalPackageVersion(packageId, version)
            
            // 删除临时文件
            tempFile.delete()
            
            withContext(Dispatchers.Main) {
                hideDownloadProgress()
                // 重新加载 WebView
                webView.loadUrl("file://${extractDir.absolutePath}/index.html")
            }
        } else {
            withContext(Dispatchers.Main) {
                hideDownloadProgress()
                Toast.makeText(this@MainActivity, "离线包下载失败", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    /**
     * 获取本地离线包版本
     */
    private fun getLocalPackageVersion(packageId: String): String {
        val prefs = getSharedPreferences("offline_packages", Context.MODE_PRIVATE)
        return prefs.getString("${packageId}_version", "1.0.0") ?: "1.0.0"
    }
    
    /**
     * 保存本地离线包版本
     */
    private fun saveLocalPackageVersion(packageId: String, version: String) {
        val prefs = getSharedPreferences("offline_packages", Context.MODE_PRIVATE)
        prefs.edit().putString("${packageId}_version", version).apply()
    }
    
    /**
     * 显示更新对话框
     */
    private fun showUpdateDialog(updateInfo: UpdateInfo) {
        AlertDialog.Builder(this)
            .setTitle("发现新版本")
            .setMessage("版本：${updateInfo.latestVersion}\n\n更新内容：\n${updateInfo.releaseNotes}")
            .setPositiveButton("立即更新") { _, _ ->
                lifecycleScope.launch {
                    downloadAndUpdatePackage("com.example.webapp", updateInfo.latestVersion)
                }
            }
            .setNegativeButton("稍后更新", null)
            .show()
    }
}

/**
 * 使用说明：
 * 
 * 1. 在 MainActivity 的 onCreate 中调用 checkOfflinePackageUpdates()
 * 2. 确保应用有网络权限：<uses-permission android:name="android.permission.INTERNET" />
 * 3. 修改 baseUrl 为你的离线包管理平台地址
 * 4. 根据实际需求调整包ID和版本管理逻辑
 * 
 * 离线包管理平台功能：
 * - ✅ 版本检查：自动检测是否有新版本可用
 * - ✅ 文件下载：安全下载离线包文件
 * - ✅ 增量更新：支持增量包减少下载量（可选）
 * - ✅ 强制更新：支持关键安全更新的强制推送
 * - ✅ 多应用管理：可管理多个不同的离线包
 * - ✅ 统计分析：后台可查看下载统计和用户分析
 */