import Database, { type RunResult } from "better-sqlite3";
import fs from "fs";
import path from "path";
import type {
  ContainerType,
  ReportType,
  StatusType,
  UserType,
} from "~/types/definitions";
import { generateRandomUsername } from "~/utils/generateRandomUsername";
import { generateUUID } from "~/utils/generateUUID";
import { parseCookies } from "~/utils/parseCookies";

const dbPath = process.env.DB_PATH ?? "./data/app.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS containers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    lat REAL,
    lng REAL,
    isFull INTEGER DEFAULT 0,
    last_reported_at TEXT,
    type TEXT NOT NULL CHECK (type IN ('paper', 'plastic', 'glass', 'mixed'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
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
    FOREIGN KEY(container_code) REFERENCES containers(code),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
  CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
  CREATE INDEX IF NOT EXISTS idx_reports_container_code ON reports(container_code);
`);

const containerCols = db.prepare("PRAGMA table_info(containers)").all();
const hasLastReported = containerCols.some(
  (c) => c.name === "last_reported_at"
);
if (!hasLastReported) {
  db.exec("ALTER TABLE containers ADD COLUMN last_reported_at TEXT");
}
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_containers_last_reported_at ON containers(last_reported_at)"
);

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
): { container: ContainerType; reports: ReportType[] } | undefined {
  db.prepare("INSERT OR IGNORE INTO containers (code, type) VALUES (?, ?)").run(
    code,
    type ?? "paper"
  );

  const { container, reports } = getContainerWithReports(code);

  return { container, reports };
}

export function addLocationToContainer(
  lat: number,
  lng: number,
  code?: string
): ContainerType | null {
  const target = (
    code !== undefined
      ? db.prepare("SELECT id, code FROM containers WHERE code = ?").get(code)
      : db
          .prepare("SELECT id, code FROM containers ORDER BY id DESC LIMIT 1")
          .get()
  ) as { code: string; id: number };

  if (!target) {
    return null;
  }

  db.prepare("UPDATE containers SET lat = ?, lng = ? WHERE id = ?").run(
    lat,
    lng,
    target.id
  );

  return getContainer(target.code) ?? null;
}

export function getContainerWithReports(code: string): {
  container: ContainerType;
  reports: ReportType[];
} | null {
  const container = db
    .prepare("SELECT * FROM containers WHERE code = ?")
    .get(code) as ContainerType | undefined;
  if (!container) return null;

  const reports = db
    .prepare(
      `SELECT * FROM reports
       WHERE container_code = ?
       ORDER BY created_at DESC`
    )
    .all(code) as ReportType[];

  return { container, reports };
}

export function setContainerFullness(
  code: string,
  isFull: boolean,
  userId: number
): RunResult {
  createReport(code, isFull ? "full" : "empty", userId);

  db.prepare(
    "UPDATE users SET reports_count = reports_count + 1, last_reported_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(userId);

  return db
    .prepare(
      "UPDATE containers SET isFull = ?, last_reported_at = CURRENT_TIMESTAMP WHERE code = ?"
    )
    .run(isFull ? 1 : 0, code);
}

export function addContainer(
  code: string,
  lat: number | null,
  lng: number | null,
  type: ContainerType["type"] = "paper"
): RunResult {
  return db
    .prepare(
      "INSERT OR IGNORE INTO containers (code, lat, lng, type) VALUES (?, ?, ?, ?)"
    )
    .run(code, lat, lng, type);
}

export function createReport(
  code: string,
  status: StatusType,
  userId: number
): RunResult {
  return db
    .prepare(
      "INSERT INTO reports (container_code, status, user_id) VALUES (?, ?, ?)"
    )
    .run(code, status, userId);
}

export function findUserByDeviceId(deviceId: string) {
  return db.prepare("SELECT * FROM users WHERE device_id = ?").get(deviceId) as
    | UserType
    | undefined;
}

export function insertUser(deviceId: string, name: string | null = null) {
  db.prepare(
    `INSERT INTO users (device_id, name)
     VALUES (?, ?)
     ON CONFLICT(device_id) DO UPDATE SET device_id = excluded.device_id`
  ).run(deviceId, name);
  return findUserByDeviceId(deviceId) as UserType;
}

export function getReportsByContainer(code: string): ReportType[] {
  const reports = db
    .prepare("SELECT * FROM reports WHERE container_code = ?")
    .all(code) as ReportType[];
  return reports;
}

export function getOrCreateUser(request: Request) {
  const cookies = parseCookies(request.headers.get("Cookie"));
  let deviceId = cookies.device_id;
  let setCookie: string | null = null;
  if (!deviceId) {
    deviceId = generateUUID();
    setCookie = `device_id=${deviceId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
  }

  let user = findUserByDeviceId(deviceId);

  if (!user) {
    user;
    user = insertUser(deviceId, generateRandomUsername());
  }

  return {
    user,
    deviceId,
    setCookie,
  };
}

export { db };
