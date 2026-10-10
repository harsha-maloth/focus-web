package app.focus.harsha.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Transaction

/** One app's foreground time on one local day. `date` is ISO text (2026-10-10) so ranges sort. */
@Entity(tableName = "daily_usage", primaryKeys = ["date", "pkg"])
data class DailyUsageEntity(val date: String, val pkg: String, val label: String, val ms: Long)

@Dao
abstract class DailyUsageDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun upsertAll(rows: List<DailyUsageEntity>)

    @Query("DELETE FROM daily_usage WHERE date = :date")
    abstract suspend fun deleteDate(date: String)

    @Query("SELECT * FROM daily_usage WHERE date BETWEEN :from AND :to ORDER BY date, ms DESC")
    abstract suspend fun range(from: String, to: String): List<DailyUsageEntity>

    @Transaction
    open suspend fun replaceDay(date: String, rows: List<DailyUsageEntity>) {
        deleteDate(date)
        upsertAll(rows)
    }
}

@Database(entities = [DailyUsageEntity::class], version = 1, exportSchema = false)
abstract class FocusDb : RoomDatabase() {
    abstract fun usage(): DailyUsageDao

    companion object {
        @Volatile private var instance: FocusDb? = null

        fun get(context: Context): FocusDb =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(context.applicationContext, FocusDb::class.java, "focus.db")
                    .build()
                    .also { instance = it }
            }
    }
}
