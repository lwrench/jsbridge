package com.example.jsbridgedemo.offline

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import org.apache.commons.io.FileUtils
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

class PackageStorage(private val context: Context) {
    
    companion object {
        private const val TAG = "PackageStorage"
        private const val OFFLINE_DIR = "offline_packages"
        private const val CURRENT_DIR = "current"
        private const val VERSIONS_DIR = "versions"
        private const val TEMP_DIR = "temp"
        private const val PATCHES_DIR = "patches"
        private const val METADATA_FILE = "metadata.json"
    }
    
    private val gson = Gson()
    private val baseDir = File(context.filesDir, OFFLINE_DIR)
    private val currentDir = File(baseDir, CURRENT_DIR)
    private val versionsDir = File(baseDir, VERSIONS_DIR)
    private val tempDir = File(baseDir, TEMP_DIR)
    private val patchesDir = File(baseDir, PATCHES_DIR)
    private val metadataFile = File(baseDir, METADATA_FILE)
    
    init {
        createDirectories()
    }
    
    private fun createDirectories() {
        listOf(baseDir, currentDir, versionsDir, tempDir, patchesDir).forEach { dir ->
            if (!dir.exists()) {
                dir.mkdirs()
                Log.d(TAG, "Created directory: ${dir.absolutePath}")
            }
        }
    }
    
    fun savePackage(packageFile: File, manifest: PackageManifest): Boolean {
        return try {
            val versionDir = File(versionsDir, manifest.version)
            if (versionDir.exists()) {
                FileUtils.deleteDirectory(versionDir)
            }
            versionDir.mkdirs()
            
            // Extract package
            ZipUtils.extractZip(packageFile, versionDir)
            
            // Save manifest
            val manifestFile = File(versionDir, "manifest.json")
            manifestFile.writeText(gson.toJson(manifest))
            
            // Verify integrity
            if (verifyPackageIntegrity(versionDir, manifest)) {
                Log.d(TAG, "Package ${manifest.version} saved successfully")
                true
            } else {
                FileUtils.deleteDirectory(versionDir)
                Log.e(TAG, "Package integrity verification failed")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save package", e)
            false
        }
    }
    
    fun activateVersion(version: String): Boolean {
        return try {
            val versionDir = File(versionsDir, version)
            if (!versionDir.exists()) {
                Log.e(TAG, "Version $version not found")
                return false
            }
            
            // Clear current directory
            if (currentDir.exists()) {
                FileUtils.deleteDirectory(currentDir)
            }
            currentDir.mkdirs()
            
            // Copy version to current
            FileUtils.copyDirectory(versionDir, currentDir)
            
            // Update metadata
            updateCurrentVersion(version)
            
            Log.d(TAG, "Activated version: $version")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to activate version $version", e)
            false
        }
    }
    
    fun getResource(path: String): File? {
        val resourceFile = File(currentDir, path)
        return if (resourceFile.exists() && resourceFile.isFile) {
            resourceFile
        } else {
            null
        }
    }
    
    fun getCurrentManifest(): PackageManifest? {
        return try {
            val manifestFile = File(currentDir, "manifest.json")
            if (manifestFile.exists()) {
                val json = manifestFile.readText()
                gson.fromJson(json, PackageManifest::class.java)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read current manifest", e)
            null
        }
    }
    
    fun getMetadata(): PackageMetadata {
        return try {
            if (metadataFile.exists()) {
                val json = metadataFile.readText()
                gson.fromJson(json, PackageMetadata::class.java)
            } else {
                PackageMetadata(
                    currentVersion = null,
                    availableVersions = emptyList(),
                    downloadHistory = emptyList()
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read metadata", e)
            PackageMetadata(
                currentVersion = null,
                availableVersions = emptyList(),
                downloadHistory = emptyList()
            )
        }
    }
    
    fun saveMetadata(metadata: PackageMetadata) {
        try {
            val json = gson.toJson(metadata)
            metadataFile.writeText(json)
            Log.d(TAG, "Metadata saved successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save metadata", e)
        }
    }
    
    private fun updateCurrentVersion(version: String) {
        val metadata = getMetadata()
        val newMetadata = metadata.copy(
            currentVersion = version,
            availableVersions = (metadata.availableVersions + version).distinct()
        )
        saveMetadata(newMetadata)
    }
    
    private fun verifyPackageIntegrity(packageDir: File, manifest: PackageManifest): Boolean {
        return try {
            manifest.files.all { (fileName, fileInfo) ->
                val file = File(packageDir, fileInfo.path)
                if (!file.exists()) {
                    Log.w(TAG, "File not found: ${fileInfo.path}")
                    false
                } else {
                    val actualChecksum = calculateChecksum(file)
                    val expectedChecksum = fileInfo.checksum
                    if (actualChecksum != expectedChecksum) {
                        Log.w(TAG, "Checksum mismatch for ${fileInfo.path}")
                        false
                    } else {
                        true
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error verifying package integrity", e)
            false
        }
    }
    
    private fun calculateChecksum(file: File): String {
        return try {
            val digest = MessageDigest.getInstance("MD5")
            FileInputStream(file).use { inputStream ->
                val buffer = ByteArray(8192)
                var read: Int
                while (inputStream.read(buffer).also { read = it } > 0) {
                    digest.update(buffer, 0, read)
                }
            }
            digest.digest().joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to calculate checksum", e)
            ""
        }
    }
    
    fun getTempFile(name: String): File {
        return File(tempDir, name)
    }
    
    fun cleanupOldVersions() {
        try {
            val metadata = getMetadata()
            val versions = versionsDir.listFiles()?.filter { it.isDirectory }?.map { it.name } ?: return
            
            if (versions.size > metadata.maxVersionsToKeep) {
                val versionsToDelete = versions.sorted().dropLast(metadata.maxVersionsToKeep)
                versionsToDelete.forEach { version ->
                    val versionDir = File(versionsDir, version)
                    FileUtils.deleteDirectory(versionDir)
                    Log.d(TAG, "Deleted old version: $version")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cleanup old versions", e)
        }
    }
    
    fun getStorageUsage(): Long {
        return try {
            FileUtils.sizeOfDirectory(baseDir)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to calculate storage usage", e)
            0L
        }
    }
    
    fun clearCache() {
        try {
            FileUtils.deleteDirectory(tempDir)
            FileUtils.deleteDirectory(patchesDir)
            tempDir.mkdirs()
            patchesDir.mkdirs()
            Log.d(TAG, "Cache cleared successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear cache", e)
        }
    }
}