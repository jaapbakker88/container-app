import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
const dbPath = process.env.DB_PATH ?? "./data/app.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.exec("BEGIN");
try {
  // Ensure base containers table exists so we can safely alter it even on fresh DBs
  db.exec(`
    CREATE TABLE IF NOT EXISTS containers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      lat REAL,
      lng REAL,
      isFull INTEGER DEFAULT 0,
      type TEXT NOT NULL CHECK (type IN ('paper','plastic','glass','mixed'))
    );
  `);

  const hasUsers = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    )
    .get();
  if (!hasUsers) {
    db.exec(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    device_id TEXT UNIQUE NOT NULL,
    reports_count INTEGER NOT NULL DEFAULT 0,
    last_reported_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  }

  const hasReports = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='reports'"
    )
    .get();
  if (!hasReports) {
    db.exec(`CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    container_code TEXT NOT NULL,
    user_id INTEGER,
    status TEXT NOT NULL CHECK (status IN ('full','empty')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(container_code) REFERENCES containers(code),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`);
  } else {
    const cols = db.prepare("PRAGMA table_info(reports)").all();
    const hasUserId = cols.some((c) => c.name === "user_id");
    if (!hasUserId) {
      db.exec("ALTER TABLE reports ADD COLUMN user_id INTEGER");
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)"
      );
    }
  }

  const containerCols = db.prepare("PRAGMA table_info(containers)").all();
  const hasLastReported = containerCols.some(
    (c) => c.name === "last_reported_at"
  );
  if (!hasLastReported) {
    db.exec("ALTER TABLE containers ADD COLUMN last_reported_at TEXT");
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_containers_last_reported_at ON containers(last_reported_at)"
    );
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_reports_container_code ON reports(container_code)"
  );
  db.exec("COMMIT");
  console.log("reports table ready");
} catch (err) {
  db.exec("ROLLBACK");
  throw err;
}
