package com.example.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface BreakRecordDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: BreakRecord): Long

    @Delete
    suspend fun delete(record: BreakRecord)

    @Query("SELECT * FROM break_records WHERE dateString = :dateString ORDER BY startTimeMs DESC")
    fun getBreaksForDate(dateString: String): Flow<List<BreakRecord>>

    @Query("SELECT * FROM break_records WHERE dateString = :dateString ORDER BY startTimeMs DESC")
    suspend fun getBreaksForDateSync(dateString: String): List<BreakRecord>

    @Query("DELETE FROM break_records WHERE dateString = :dateString")
    suspend fun clearBreaksForDate(dateString: String)

    @Query("SELECT * FROM break_records WHERE dateString LIKE :yearMonth || '%' ORDER BY startTimeMs DESC")
    fun getBreaksForMonth(yearMonth: String): Flow<List<BreakRecord>>

    @Query("SELECT * FROM break_records WHERE dateString LIKE :yearMonth || '%' ORDER BY startTimeMs DESC")
    suspend fun getBreaksForMonthSync(yearMonth: String): List<BreakRecord>

    @Query("DELETE FROM break_records WHERE dateString LIKE :yearMonth || '%'")
    suspend fun clearBreaksForMonth(yearMonth: String)

    @Query("DELETE FROM break_records WHERE dateString < :beforeDateString")
    suspend fun clearBreaksOlderThan(beforeDateString: String)

    @Query("DELETE FROM break_records")
    suspend fun clearAllBreaks()
}
