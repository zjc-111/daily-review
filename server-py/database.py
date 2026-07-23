"""SQLite database connection and initialization."""
import os
import aiosqlite
from pathlib import Path

DB_PATH = os.getenv("DB_PATH", str(Path(__file__).parent.parent / "data" / "app.db"))

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    """Return the shared database connection. Initializes on first call."""
    global _db
    if _db is None:
        data_dir = Path(DB_PATH).parent
        data_dir.mkdir(parents=True, exist_ok=True)

        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
        await init_tables(_db)
    return _db


async def init_tables(db: aiosqlite.Connection) -> None:
    """Create tables if they don't exist."""
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            phone TEXT NOT NULL UNIQUE,
            sms_code TEXT,
            sms_token_expire_at INTEGER,
            created_at INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key ON users(phone);
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

        CREATE TABLE IF NOT EXISTS daily_entries (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL UNIQUE,
            content TEXT NOT NULL,
            highlights TEXT DEFAULT '[]',
            problems TEXT DEFAULT '[]',
            suggestions TEXT DEFAULT '[]',
            patterns TEXT DEFAULT '[]',
            review_generated_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            mood INTEGER,
            energy INTEGER
        );
        CREATE UNIQUE INDEX IF NOT EXISTS daily_entries_date_key ON daily_entries(date);
        CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(date);

        CREATE TABLE IF NOT EXISTS ai_reviews (
            id TEXT PRIMARY KEY,
            daily_entry_id TEXT,
            model TEXT NOT NULL DEFAULT 'rule-engine',
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ai_reviews_entry ON ai_reviews(daily_entry_id);

        CREATE TABLE IF NOT EXISTS period_reviews (
            id TEXT PRIMARY KEY,
            period_type TEXT NOT NULL,
            period_label TEXT NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            entry_count INTEGER NOT NULL DEFAULT 0,
            summary TEXT NOT NULL,
            highlights TEXT DEFAULT '[]',
            problems TEXT DEFAULT '[]',
            suggestions TEXT DEFAULT '[]',
            outlook TEXT,
            generated_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_period_reviews_type_dates ON period_reviews(period_type, period_start);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_period_reviews_unique ON period_reviews(period_type, period_start);

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_key ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    """)
    await db.commit()
