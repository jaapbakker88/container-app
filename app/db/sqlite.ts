import Database, { type RunResult } from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { ContainerType, StatusType, UserType } from "~/types/definitions";
import { generateRandomUsername } from "~/utils/generateRandomUsername";
import { generateUUID } from "~/utils/generateUUID";
import { parseCookies } from "~/utils/parseCookies";

const dbPath = process.env.DB_PATH ?? "./data/app.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS containers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    lat REAL,
    lng REAL,
    isFull INTEGER DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('paper', 'plastic', 'glass', 'mixed')),
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    device_id TEXT UNIQUE NOT NULL,
    reports_count INTEGER NOT NULL DEFAULT 0,
    last_reported_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    container_code TEXT NOT NULL,
    user_id INTEGER,
    status TEXT NOT NULL CHECK (status IN ('full','empty')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
  CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
  CREATE INDEX IF NOT EXISTS idx_reports_container_code ON reports(container_code);
`);

// Migrations for existing databases
try { db.exec("ALTER TABLE containers ADD COLUMN updatedAt TEXT"); } catch { /* already exists */ }

// Drop FK from reports.container_code so containers can be deleted without affecting reports/streaks
try {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reports'").get() as { sql: string } | undefined;
  if (row?.sql.includes("FOREIGN KEY(container_code)")) {
    db.exec(`
      BEGIN;
      CREATE TABLE reports_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        container_code TEXT NOT NULL,
        user_id INTEGER,
        status TEXT NOT NULL CHECK (status IN ('full','empty')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      INSERT INTO reports_new SELECT * FROM reports;
      DROP TABLE reports;
      ALTER TABLE reports_new RENAME TO reports;
      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_reports_container_code ON reports(container_code);
      COMMIT;
    `);
  }
} catch { /* already migrated */ }

export function getContainers(): ContainerType[] {
  return db.prepare("SELECT * FROM containers").all() as ContainerType[];
}

export function getContainer(code: string): ContainerType | undefined {
  return db.prepare("SELECT * FROM containers WHERE code = ?").get(code) as
    | ContainerType
    | undefined;
}

export function getOrCreateContainer(
  code: string,
  type: ContainerType["type"]
): ContainerType | undefined {
  db.prepare("INSERT OR IGNORE INTO containers (code, type, updatedAt) VALUES (?, ?, datetime('now'))").run(
    code,
    type ?? "paper"
  );
  return getContainer(code);
}

export function addLocationToContainer(
  lat: number,
  lng: number,
  code?: string
): ContainerType | null {
  const target = (
    code !== undefined
      ? db.prepare("SELECT id, code FROM containers WHERE code = ?").get(code)
      : db.prepare("SELECT id, code FROM containers ORDER BY id DESC LIMIT 1").get()
  ) as { id: number; code: string } | undefined;

  if (!target) return null;

  db.prepare("UPDATE containers SET lat = ?, lng = ?, updatedAt = datetime('now') WHERE id = ?").run(
    lat,
    lng,
    target.id
  );

  return getContainer(target.code) ?? null;
}

export function markFull(code: string): RunResult {
  return db.prepare("UPDATE containers SET isFull = 1 WHERE code = ?").run(code);
}

export function setContainerFullness(code: string, isFull: boolean, userId: number): RunResult {
  createReport(code, isFull ? "full" : "empty", userId);

  db.prepare(
    "UPDATE users SET reports_count = reports_count + 1, last_reported_at = datetime('now') WHERE id = ?"
  ).run(userId);

  return db
    .prepare("UPDATE containers SET isFull = ?, updatedAt = datetime('now') WHERE code = ?")
    .run(isFull ? 1 : 0, code);
}

export function addContainer(
  code: string,
  lat: number | null,
  lng: number | null,
  type: ContainerType["type"] = "paper"
): RunResult {
  return db
    .prepare("INSERT OR IGNORE INTO containers (code, lat, lng, type) VALUES (?, ?, ?, ?)")
    .run(code, lat, lng, type);
}

export function createReport(code: string, status: StatusType, userId: number): RunResult {
  return db
    .prepare("INSERT INTO reports (container_code, status, user_id) VALUES (?, ?, ?)")
    .run(code, status, userId);
}

export function findUserByDeviceId(deviceId: string): UserType | undefined {
  return db.prepare("SELECT * FROM users WHERE device_id = ?").get(deviceId) as
    | UserType
    | undefined;
}

export function insertUser(deviceId: string, name: string): UserType {
  db.prepare(
    `INSERT INTO users (device_id, name)
     VALUES (?, ?)
     ON CONFLICT(device_id) DO UPDATE SET device_id = excluded.device_id`
  ).run(deviceId, name);
  return findUserByDeviceId(deviceId) as UserType;
}

export function getOrCreateUser(request: Request): { user: UserType; setCookie: string | null } {
  const cookies = parseCookies(request.headers.get("Cookie"));
  let deviceId = cookies.device_id;
  let setCookie: string | null = null;

  if (!deviceId) {
    deviceId = generateUUID();
    setCookie = `device_id=${deviceId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
  }

  let user = findUserByDeviceId(deviceId);
  if (!user) {
    user = insertUser(deviceId, generateRandomUsername());
  }

  return { user, setCookie };
}

export function getGlobalStats(): {
  totalBins: number;
  totalReports: number;
  activeContributors: number;
} {
  const { totalBins } = db
    .prepare("SELECT COUNT(*) AS totalBins FROM containers")
    .get() as { totalBins: number };
  const { totalReports } = db
    .prepare("SELECT COUNT(*) AS totalReports FROM reports")
    .get() as { totalReports: number };
  const { activeContributors } = db
    .prepare(
      "SELECT COUNT(DISTINCT user_id) AS activeContributors FROM reports"
    )
    .get() as { activeContributors: number };
  return { totalBins, totalReports, activeContributors };
}

export function setContainerStatus(code: string, isFull: boolean): void {
  db.prepare(
    "UPDATE containers SET isFull = ?, updatedAt = datetime('now') WHERE code = ?"
  ).run(isFull ? 1 : 0, code);
}

export function deleteContainer(code: string): void {
  db.prepare("DELETE FROM containers WHERE code = ?").run(code);
}

export function clearContainerLocation(code: string): void {
  db.prepare(
    "UPDATE containers SET lat = NULL, lng = NULL, updatedAt = datetime('now') WHERE code = ?"
  ).run(code);
}

export { db };
