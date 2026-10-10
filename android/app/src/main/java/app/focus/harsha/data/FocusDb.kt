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

/** A focus session. status: running, completed or ended_early. endMs is null while running. */
@Entity(tableName = "focus_session")
data class FocusSessionEntity(
    @androidx.room.PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startMs: Long,
    val plannedMs: Long,
    val endMs: Long?,
    val status: String,
)

/** An app that stays usable during a focus session. */
@Entity(tableName = "allowed_app")
data class AllowedAppEntity(@androidx.room.PrimaryKey val pkg: String, val label: String)

@Dao
abstract class FocusSessionDao {
    @Insert
    abstract suspend fun insert(session: FocusSessionEntity): Long

    @Query("SELECT * FROM focus_session WHERE status = 'running' ORDER BY id DESC LIMIT 1")
    abstract suspend fun running(): FocusSessionEntity?

    @Query("UPDATE focus_session SET endMs = :endMs, status = :status WHERE id = :id AND status = 'running'")
    abstract suspend fun finish(id: Long, endMs: Long, status: String)

    @Query("SELECT * FROM focus_session WHERE status != 'running' ORDER BY startMs DESC LIMIT :limit")
    abstract suspend fun recent(limit: Int): List<FocusSessionEntity>
}

@Dao
abstract class AllowedAppDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    abstract suspend fun upsert(app: AllowedAppEntity)

    @Query("DELETE FROM allowed_app WHERE pkg = :pkg")
    abstract suspend fun delete(pkg: String)

    @Query("SELECT * FROM allowed_app ORDER BY label COLLATE NOCASE")
    abstract suspend fun all(): List<AllowedAppEntity>
}

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

@Database(entities = [DailyUsageEntity::class, AppLimitEntity::class, FocusSessionEntity::class, AllowedAppEntity::class], version = 5, exportSchema = false)
abstract class FocusDb : RoomDatabase() {
    abstract fun usage(): DailyUsageDao
    abstract fun limits(): AppLimitDao
    abstract fun sessions(): FocusSessionDao
    abstract fun allowed(): AllowedAppDao

    companion object {
        @Volatile private var instance: FocusDb? = null

        /**
         * 2 to 3: the first usage maths overcounted (48 h in one day), and stored days are only ever
         * replaced by larger values, so the bad rows would stay. Clear them; they refill from the
         * system log with the corrected maths.
         */
        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("DELETE FROM `daily_usage`")
            }
        }

        /** 4 to 5: adds focus_session and allowed_app. Everything else is kept. */
        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `focus_session` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `startMs` INTEGER NOT NULL, `plannedMs` INTEGER NOT NULL, `endMs` INTEGER, `status` TEXT NOT NULL)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `allowed_app` (`pkg` TEXT NOT NULL, `label` TEXT NOT NULL, PRIMARY KEY(`pkg`))")
            }
        }

        /** 3 to 4: usage now comes from the system's daily totals; clear days computed the old way. */
        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("DELETE FROM `daily_usage`")
            }
        }

        /** 1 to 2: adds the app_limit table. Usage history is kept. */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `app_limit` (`pkg` TEXT NOT NULL, `label` TEXT NOT NULL, `limitMs` INTEGER NOT NULL, PRIMARY KEY(`pkg`))")
            }
        }

        fun get(context: Context): FocusDb =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(context.applicationContext, FocusDb::class.java, "focus.db")
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5)
                    .build()
                    .also { instance = it }
            }
    }
}
