package com.example.jsbridgedemo.offline

import android.util.Log
import java.io.*
import java.util.*

object BsdiffPatcher {
    
    private const val TAG = "BsdiffPatcher"
    private const val MAGIC = "BSDIFF40"
    
    data class PatchInfo(
        val controlLength: Long,
        val diffLength: Long,
        val newSize: Long
    )
    
    fun applyPatch(oldFile: File, patchFile: File, newFile: File): Boolean {
        return try {
            RandomAccessFile(oldFile, "r").use { oldRaf ->
                DataInputStream(FileInputStream(patchFile)).use { patchStream ->
                    FileOutputStream(newFile).use { newStream ->
                        applyPatchInternal(oldRaf, patchStream, newStream)
                    }
                }
            }
            Log.d(TAG, "Patch applied successfully: ${oldFile.name} -> ${newFile.name}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to apply patch", e)
            if (newFile.exists()) {
                newFile.delete()
            }
            false
        }
    }
    
    private fun applyPatchInternal(
        oldFile: RandomAccessFile,
        patchStream: DataInputStream,
        newStream: OutputStream
    ) {
        // Read and verify magic
        val magic = ByteArray(8)
        patchStream.readFully(magic)
        if (!Arrays.equals(magic, MAGIC.toByteArray())) {
            throw IllegalArgumentException("Invalid patch file format")
        }
        
        // Read patch info
        val controlLength = patchStream.readLong()
        val diffLength = patchStream.readLong()
        val newSize = patchStream.readLong()
        
        Log.d(TAG, "Patch info - Control: $controlLength, Diff: $diffLength, NewSize: $newSize")
        
        // Read control block
        val controlBlock = ByteArray(controlLength.toInt())
        patchStream.readFully(controlBlock)
        
        // Read diff block
        val diffBlock = ByteArray(diffLength.toInt())
        patchStream.readFully(diffBlock)
        
        // Read extra block
        val extraBlock = patchStream.readAllBytes()
        
        // Apply patch
        applyPatchBlocks(
            oldFile,
            controlBlock,
            diffBlock,
            extraBlock,
            newStream,
            newSize
        )
    }
    
    private fun applyPatchBlocks(
        oldFile: RandomAccessFile,
        controlBlock: ByteArray,
        diffBlock: ByteArray,
        extraBlock: ByteArray,
        newStream: OutputStream,
        newSize: Long
    ) {
        var oldPos = 0L
        var newPos = 0L
        var diffPos = 0
        var extraPos = 0
        var controlPos = 0
        
        while (newPos < newSize) {
            // Read control data (3 longs)
            if (controlPos + 24 > controlBlock.size) break
            
            val diffLen = readLongFromBytes(controlBlock, controlPos)
            controlPos += 8
            val copyLen = readLongFromBytes(controlBlock, controlPos)
            controlPos += 8
            val seekLen = readLongFromBytes(controlBlock, controlPos)
            controlPos += 8
            
            // Add old data to diff string
            if (diffLen > 0) {
                val oldData = ByteArray(diffLen.toInt())
                oldFile.seek(oldPos)
                oldFile.readFully(oldData)
                
                for (i in 0 until diffLen.toInt()) {
                    if (diffPos + i < diffBlock.size) {
                        oldData[i] = (oldData[i] + diffBlock[diffPos + i]).toByte()
                    }
                }
                
                newStream.write(oldData)
                oldPos += diffLen
                newPos += diffLen
                diffPos += diffLen.toInt()
            }
            
            // Copy from extra string
            if (copyLen > 0) {
                val copyData = ByteArray(copyLen.toInt())
                System.arraycopy(extraBlock, extraPos, copyData, 0, copyLen.toInt())
                newStream.write(copyData)
                newPos += copyLen
                extraPos += copyLen.toInt()
            }
            
            // Seek in old file
            oldPos += seekLen
        }
    }
    
    private fun readLongFromBytes(bytes: ByteArray, offset: Int): Long {
        return ((bytes[offset].toLong() and 0xFF)) or
                ((bytes[offset + 1].toLong() and 0xFF) shl 8) or
                ((bytes[offset + 2].toLong() and 0xFF) shl 16) or
                ((bytes[offset + 3].toLong() and 0xFF) shl 24) or
                ((bytes[offset + 4].toLong() and 0xFF) shl 32) or
                ((bytes[offset + 5].toLong() and 0xFF) shl 40) or
                ((bytes[offset + 6].toLong() and 0xFF) shl 48) or
                ((bytes[offset + 7].toLong() and 0xFF) shl 56)
    }
    
    fun validatePatchFile(patchFile: File): Boolean {
        return try {
            DataInputStream(FileInputStream(patchFile)).use { stream ->
                val magic = ByteArray(8)
                stream.readFully(magic)
                Arrays.equals(magic, MAGIC.toByteArray())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Patch file validation failed", e)
            false
        }
    }
    
    // Simple diff creator for testing (not production ready)
    fun createSimplePatch(oldFile: File, newFile: File, patchFile: File): Boolean {
        return try {
            val oldData = oldFile.readBytes()
            val newData = newFile.readBytes()
            
            DataOutputStream(FileOutputStream(patchFile)).use { output ->
                // Write magic
                output.write(MAGIC.toByteArray())
                
                // For simplicity, create a patch that just replaces everything
                output.writeLong(24L) // Control length (3 longs)
                output.writeLong(0L)  // Diff length
                output.writeLong(newData.size.toLong()) // New size
                
                // Control block: copy entire new file from extra
                output.writeLong(0L) // No diff
                output.writeLong(newData.size.toLong()) // Copy all from extra
                output.writeLong(0L) // No seek
                
                // No diff block
                
                // Extra block: entire new file
                output.write(newData)
            }
            
            Log.d(TAG, "Simple patch created: ${patchFile.name}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create patch", e)
            false
        }
    }
}