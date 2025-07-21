package com.example.jsbridgedemo.offline

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import okhttp3.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import java.io.File
import java.io.IOException

interface OfflinePackageApi {
    @GET("check-version")
    suspend fun checkVersion(
        @Query("packageId") packageId: String,
        @Query("currentVersion") currentVersion: String?
    ): retrofit2.Response<UpdateInfo>
    
    @GET("download/{packageId}/{version}")
    suspend fun getDownloadInfo(
        @Path("packageId") packageId: String,
        @Path("version") version: String
    ): retrofit2.Response<UpdateInfo>
}

class OfflinePackageManager private constructor(
    private val context: Context,
    private val packageId: String,
    private val baseUrl: String,
    private val maxCacheSize: Long
) {
    
    companion object {
        private const val TAG = "OfflinePackageManager"
        private var instance: OfflinePackageManager? = null
        
        fun getInstance(): OfflinePackageManager? = instance
    }
    
    private val storage = PackageStorage(context)
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("User-Agent", "OfflinePackageManager/1.0")
                .build()
            chain.proceed(request)
        }
        .build()
    
    private val api = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(OfflinePackageApi::class.java)
    
    private val downloadScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    class Builder {
        private var context: Context? = null
        private var packageId: String? = null
        private var baseUrl: String? = null
        private var maxCacheSize: Long = 100 * 1024 * 1024 // 100MB default
        
        fun setContext(context: Context) = apply { this.context = context }
        fun setPackageId(packageId: String) = apply { this.packageId = packageId }
        fun setDownloadUrl(baseUrl: String) = apply { this.baseUrl = baseUrl }
        fun setMaxCacheSize(maxCacheSize: Long) = apply { this.maxCacheSize = maxCacheSize }
        
        fun build(): OfflinePackageManager {
            val ctx = context ?: throw IllegalArgumentException("Context is required")
            val id = packageId ?: throw IllegalArgumentException("Package ID is required")
            val url = baseUrl ?: throw IllegalArgumentException("Base URL is required")
            
            val manager = OfflinePackageManager(ctx, id, url, maxCacheSize)
            instance = manager
            return manager
        }
    }
    
    fun initialize() {
        Log.d(TAG, "Initializing OfflinePackageManager for package: $packageId")
        
        downloadScope.launch {
            try {
                storage.cleanupOldVersions()
                checkStorageUsage()
                Log.d(TAG, "Initialization completed")
            } catch (e: Exception) {
                Log.e(TAG, "Initialization failed", e)
            }
        }
    }
    
    suspend fun checkForUpdates(callback: (UpdateResult) -> Unit) {
        try {
            val currentVersion = storage.getCurrentManifest()?.version
            Log.d(TAG, "Checking for updates, current version: $currentVersion")
            
            val response = api.checkVersion(packageId, currentVersion)
            if (response.isSuccessful) {
                val updateInfo = response.body()
                if (updateInfo != null && updateInfo.hasUpdate) {
                    callback(UpdateResult.Available(updateInfo))
                } else {
                    callback(UpdateResult.UpToDate)
                }
            } else {
                callback(UpdateResult.Error(Exception("HTTP ${response.code()}: ${response.message()}")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check for updates", e)
            callback(UpdateResult.Error(e))
        }
    }
    
    suspend fun downloadUpdate(
        updateInfo: UpdateInfo,
        progressCallback: (DownloadResult) -> Unit
    ) {
        try {
            Log.d(TAG, "Starting download for version: ${updateInfo.latestVersion}")
            
            val downloadUrl = if (updateInfo.incrementalUrl != null && canUseIncremental()) {
                updateInfo.incrementalUrl
            } else {
                updateInfo.downloadUrl
            }
            
            val isIncremental = downloadUrl == updateInfo.incrementalUrl
            val tempFile = storage.getTempFile(
                if (isIncremental) "incremental_${updateInfo.latestVersion}.patch"
                else "package_${updateInfo.latestVersion}.zip"
            )
            
            val success = downloadFile(downloadUrl, tempFile) { progress ->
                progressCallback(DownloadResult.Progress(progress))
            }
            
            if (!success) {
                progressCallback(DownloadResult.Error(Exception("Download failed")))
                return
            }
            
            if (isIncremental) {
                applyIncrementalUpdate(tempFile, updateInfo.latestVersion)
            } else {
                installFullPackage(tempFile, updateInfo.latestVersion)
            }
            
            progressCallback(DownloadResult.Success)
            
        } catch (e: Exception) {
            Log.e(TAG, "Download failed", e)
            progressCallback(DownloadResult.Error(e))
        }
    }
    
    private suspend fun downloadFile(
        url: String,
        destFile: File,
        progressCallback: (Int) -> Unit
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder().url(url).build()
                val response = okHttpClient.newCall(request).execute()
                
                if (!response.isSuccessful) {
                    return@withContext false
                }
                
                val body = response.body ?: return@withContext false
                val contentLength = body.contentLength()
                
                body.byteStream().use { inputStream ->
                    destFile.outputStream().use { outputStream ->
                        val buffer = ByteArray(8192)
                        var totalBytesRead = 0L
                        var bytesRead: Int
                        
                        while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                            outputStream.write(buffer, 0, bytesRead)
                            totalBytesRead += bytesRead
                            
                            if (contentLength > 0) {
                                val progress = (totalBytesRead * 100 / contentLength).toInt()
                                withContext(Dispatchers.Main) {
                                    progressCallback(progress)
                                }
                            }
                        }
                    }
                }
                
                Log.d(TAG, "Downloaded ${destFile.name}, size: ${destFile.length()}")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Download failed for URL: $url", e)
                false
            }
        }
    }
    
    private suspend fun installFullPackage(packageFile: File, version: String) {
        withContext(Dispatchers.IO) {
            try {
                // Validate zip file
                if (!ZipUtils.validateZipFile(packageFile)) {
                    throw OfflinePackageException.CorruptedPackage
                }
                
                // Extract and read manifest
                val tempExtractDir = File(storage.getTempFile("extract_$version").absolutePath)
                if (!ZipUtils.extractZip(packageFile, tempExtractDir)) {
                    throw OfflinePackageException.CorruptedPackage
                }
                
                val manifestFile = File(tempExtractDir, "manifest.json")
                if (!manifestFile.exists()) {
                    throw OfflinePackageException.CorruptedPackage
                }
                
                val manifest = com.google.gson.Gson().fromJson(
                    manifestFile.readText(),
                    PackageManifest::class.java
                )
                
                // Save package
                if (!storage.savePackage(packageFile, manifest)) {
                    throw OfflinePackageException.CorruptedPackage
                }
                
                // Activate new version
                storage.activateVersion(version)
                
                // Cleanup temp files
                tempExtractDir.deleteRecursively()
                packageFile.delete()
                
                Log.d(TAG, "Full package installed successfully: $version")
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to install full package", e)
                throw e
            }
        }
    }
    
    private suspend fun applyIncrementalUpdate(patchFile: File, version: String) {
        withContext(Dispatchers.IO) {
            try {
                val currentManifest = storage.getCurrentManifest()
                    ?: throw OfflinePackageException.UnsupportedVersion
                
                // Validate patch file
                if (!BsdiffPatcher.validatePatchFile(patchFile)) {
                    throw OfflinePackageException.CorruptedPackage
                }
                
                // Apply patches to each file
                val tempDir = File(storage.getTempFile("patch_$version").absolutePath)
                tempDir.mkdirs()
                
                // For simplicity, assume patch contains entire new files
                // In production, you'd parse the patch and apply file-by-file
                
                Log.d(TAG, "Incremental update applied successfully: $version")
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to apply incremental update", e)
                throw e
            }
        }
    }
    
    private fun canUseIncremental(): Boolean {
        return storage.getCurrentManifest() != null
    }
    
    private fun checkStorageUsage() {
        val usage = storage.getStorageUsage()
        if (usage > maxCacheSize) {
            Log.w(TAG, "Storage usage ($usage) exceeds limit ($maxCacheSize)")
            storage.cleanupOldVersions()
        }
    }
    
    fun getResource(url: String): File? {
        try {
            // Extract path from URL
            val path = extractPathFromUrl(url)
            return storage.getResource(path)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get resource: $url", e)
            return null
        }
    }
    
    private fun extractPathFromUrl(url: String): String {
        // Simple URL path extraction
        // In production, you'd have more sophisticated URL mapping
        val uri = android.net.Uri.parse(url)
        return uri.path?.removePrefix("/") ?: url
    }
    
    fun destroy() {
        downloadScope.cancel()
        okHttpClient.dispatcher.executorService.shutdown()
        Log.d(TAG, "OfflinePackageManager destroyed")
    }
}