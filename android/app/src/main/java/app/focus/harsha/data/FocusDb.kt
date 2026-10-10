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
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/** One app's foreground time on one local day. `date` is ISO text (2026-10-10) so ranges sort. */
@Entity(tableName = "daily_usage", primaryKeys = ["date", "pkg"])
data class DailyUsageEntity(val date: String, val pkg: String, val label: String, val ms: Long)

/** A daily time limit for one app. */
@Entity(tableName = "app_limit")
data class AppLimitEntity(@androidx.room.PrimaryKey val pkg: String, val label: String, val limitMs: Long)

@Dao
abstract class AppLimitDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun upsert(limit: AppLimitEntity)

    @Query("DELETE FROM app_limit WHERE pkg = :pkg")
    abstract suspend fun delete(pkg: String)

    @Query("SELECT * FROM app_limit ORDER BY label COLLATE NOCASE")
    abstract suspend fun all(): List<AppLimitEntity>
}

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

@Database(entities = [DailyUsageEntity::class, AppLimitEntity::class], version = 2, exportSchema = false)
abstract class FocusDb : RoomDatabase() {
    abstract fun usage(): DailyUsageDao
    abstract fun limits(): AppLimitDao

    companion object {
        @Volatile private var instance: FocusDb? = null

        /** 1 to 2: adds the app_limit table. Usage history is kept. */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `app_limit` (`pkg` TEXT NOT NULL, `label` TEXT NOT NULL, `limitMs` INTEGER NOT NULL, PRIMARY KEY(`pkg`))")
            }
        }

        fun get(context: Context): FocusDb =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(context.applicationContext, FocusDb::class.java, "focus.db")
                    .addMigrations(MIGRATION_1_2)
                    .build()
                    .also { instance = it }
            }
    }
}
