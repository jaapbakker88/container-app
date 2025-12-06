import Database, { type RunResult } from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { ContainerType } from "~/types/definitions";

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
    type TEXT NOT NULL CHECK (type IN ('paper', 'plastic', 'glass', 'mixed'))
  );
`);

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
  db.prepare("INSERT OR IGNORE INTO containers (code, type) VALUES (?, ?)").run(
    code,
    type ?? "paper"
  );

  // Return the existing or newly inserted row
  return getContainer(code);
}

export function addLocationToContainer(
  lat: number,
  lng: number,
  code?: string
): ContainerType | null {
  // If a code is provided, update that specific container; otherwise update the most recently created one.
  const target =
    code !== undefined
      ? db.prepare("SELECT id, code FROM containers WHERE code = ?").get(code)
      : db
          .prepare("SELECT id, code FROM containers ORDER BY id DESC LIMIT 1")
          .get();

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

export function markFull(code: string): RunResult {
  return db
    .prepare("UPDATE containers SET isFull = 1 WHERE code = ?")
    .run(code);
}

export function setContainerFullness(code: string, isFull: boolean): RunResult {
  return db
    .prepare("UPDATE containers SET isFull = ? WHERE code = ?")
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

export { db };
