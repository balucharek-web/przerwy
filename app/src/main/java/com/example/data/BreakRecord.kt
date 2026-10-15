package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "break_records")
data class BreakRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val dateString: String,      // Format YYYY-MM-DD
    val startTimeMs: Long,
    val endTimeMs: Long,
    val durationSeconds: Long,
    val note: String = ""
)
