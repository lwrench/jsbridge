package com.example.jsbridgedemo.offline

import android.util.Log
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream
import org.apache.commons.io.IOUtils
import java.io.*

object ZipUtils {
    
    private const val TAG = "ZipUtils"
    private const val BUFFER_SIZE = 8192
    
    fun extractZip(zipFile: File, destDir: File): Boolean {
        return try {
            if (!destDir.exists()) {
                destDir.mkdirs()
            }
            
            FileInputStream(zipFile).use { fis ->
                ZipArchiveInputStream(fis).use { zis ->
                    var entry: ZipArchiveEntry? = zis.nextZipEntry
                    
                    while (entry != null) {
                        val file = File(destDir, entry.name)
                        
                        // Security check - prevent zip slip
                        if (!file.canonicalPath.startsWith(destDir.canonicalPath)) {
                            Log.w(TAG, "Zip entry outside target directory: ${entry.name}")
                            entry = zis.nextZipEntry
                            continue
                        }
                        
                        if (entry.isDirectory) {
                            file.mkdirs()
                        } else {
                            file.parentFile?.mkdirs()
                            FileOutputStream(file).use { fos ->
                                IOUtils.copy(zis, fos)
                            }
                        }
                        
                        entry = zis.nextZipEntry
                    }
                }
            }
            
            Log.d(TAG, "Successfully extracted ${zipFile.name} to ${destDir.name}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract zip file", e)
            false
        }
    }
    
    fun createZip(sourceDir: File, destZipFile: File): Boolean {
        return try {
            FileOutputStream(destZipFile).use { fos ->
                ZipArchiveOutputStream(fos).use { zos ->
                    addDirToZip(zos, sourceDir, "")
                }
            }
            
            Log.d(TAG, "Successfully created zip: ${destZipFile.name}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create zip file", e)
            false
        }
    }
    
    private fun addDirToZip(zos: ZipArchiveOutputStream, dir: File, basePath: String) {
        val files = dir.listFiles() ?: return
        
        for (file in files) {
            val entryPath = if (basePath.isEmpty()) file.name else "$basePath/${file.name}"
            
            if (file.isDirectory) {
                addDirToZip(zos, file, entryPath)
            } else {
                val entry = ZipArchiveEntry(entryPath)
                entry.size = file.length()
                zos.putArchiveEntry(entry)
                
                FileInputStream(file).use { fis ->
                    IOUtils.copy(fis, zos)
                }
                
                zos.closeArchiveEntry()
            }
        }
    }
    
    fun validateZipFile(zipFile: File): Boolean {
        return try {
            FileInputStream(zipFile).use { fis ->
                ZipArchiveInputStream(fis).use { zis ->
                    var entry: ZipArchiveEntry? = zis.nextZipEntry
                    var hasEntries = false
                    
                    while (entry != null) {
                        hasEntries = true
                        
                        // Try to read some data to ensure the entry is valid
                        val buffer = ByteArray(1024)
                        var totalRead = 0
                        var read: Int
                        
                        while (zis.read(buffer).also { read = it } > 0 && totalRead < 10240) {
                            totalRead += read
                        }
                        
                        entry = zis.nextZipEntry
                    }
                    
                    hasEntries
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Zip file validation failed", e)
            false
        }
    }
}