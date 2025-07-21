package com.example.jsbridgedemo.offline

import com.google.gson.annotations.SerializedName

data class PackageManifest(
    @SerializedName("packageId")
    val packageId: String,
    
    @SerializedName("version")
    val version: String,
    
    @SerializedName("versionCode")
    val versionCode: Int,
    
    @SerializedName("minAppVersion")
    val minAppVersion: String,
    
    @SerializedName("updateTime")
    val updateTime: String,
    
    @SerializedName("size")
    val size: Long,
    
    @SerializedName("checksum")
    val checksum: String,
    
    @SerializedName("files")
    val files: Map<String, FileInfo>,
    
    @SerializedName("routes")
    val routes: Map<String, String>
)

data class FileInfo(
    @SerializedName("path")
    val path: String,
    
    @SerializedName("size")
    val size: Long,
    
    @SerializedName("checksum")
    val checksum: String
)

data class UpdateInfo(
    @SerializedName("hasUpdate")
    val hasUpdate: Boolean,
    
    @SerializedName("latestVersion")
    val latestVersion: String,
    
    @SerializedName("latestVersionCode")
    val latestVersionCode: Int,
    
    @SerializedName("downloadUrl")
    val downloadUrl: String,
    
    @SerializedName("incrementalUrl")
    val incrementalUrl: String?,
    
    @SerializedName("size")
    val size: Long,
    
    @SerializedName("incrementalSize")
    val incrementalSize: Long?,
    
    @SerializedName("forceUpdate")
    val forceUpdate: Boolean,
    
    @SerializedName("description")
    val description: String
)

data class PackageMetadata(
    @SerializedName("currentVersion")
    val currentVersion: String?,
    
    @SerializedName("availableVersions")
    val availableVersions: List<String>,
    
    @SerializedName("downloadHistory")
    val downloadHistory: List<DownloadRecord>,
    
    @SerializedName("maxVersionsToKeep")
    val maxVersionsToKeep: Int = 3
)

data class DownloadRecord(
    @SerializedName("version")
    val version: String,
    
    @SerializedName("downloadTime")
    val downloadTime: String,
    
    @SerializedName("size")
    val size: Long,
    
    @SerializedName("type")
    val type: String // "full" or "incremental"
)

sealed class UpdateResult {
    data class Available(val updateInfo: UpdateInfo) : UpdateResult()
    object UpToDate : UpdateResult()
    data class Error(val exception: Throwable) : UpdateResult()
}

sealed class DownloadResult {
    object Success : DownloadResult()
    data class Progress(val progress: Int) : DownloadResult()
    data class Error(val exception: Throwable) : DownloadResult()
}

enum class InterceptType {
    LOCAL_FIRST,
    LOCAL_ONLY,
    NETWORK_ONLY,
    NETWORK_FIRST
}

sealed class OfflinePackageException : Exception() {
    object NetworkError : OfflinePackageException()
    object CorruptedPackage : OfflinePackageException()
    object InsufficientStorage : OfflinePackageException()
    object UnsupportedVersion : OfflinePackageException()
    object SecurityViolation : OfflinePackageException()
}