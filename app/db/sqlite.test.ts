import { beforeEach, describe, expect, it } from "vitest";
import {
  clearContainerLocation,
  db,
  deleteContainer,
  findUserByDeviceId,
  insertUser,
  setContainerFullness,
  setContainerStatus,
} from "./sqlite";

beforeEach(() => {
  db.exec("DELETE FROM reports; DELETE FROM users; DELETE FROM containers;");
});

describe("setContainerFullness", () => {
  it("sets the container isFull flag to 1", () => {
    db.prepare("INSERT INTO containers (code, type) VALUES ('AAAAA', 'paper')").run();
    const user = insertUser("device-1", "tester");

    setContainerFullness("AAAAA", true, user.id);

    const row = db.prepare("SELECT isFull FROM containers WHERE code = 'AAAAA'").get() as { isFull: number };
    expect(row.isFull).toBe(1);
  });

  it("sets the container isFull flag to 0", () => {
    db.prepare("INSERT INTO containers (code, type, isFull) VALUES ('BBBBB', 'glass', 1)").run();
    const user = insertUser("device-2", "tester");

    setContainerFullness("BBBBB", false, user.id);

    const row = db.prepare("SELECT isFull FROM containers WHERE code = 'BBBBB'").get() as { isFull: number };
    expect(row.isFull).toBe(0);
  });

  it("creates a report row with the correct status", () => {
    db.prepare("INSERT INTO containers (code, type) VALUES ('CCCCC', 'plastic')").run();
    const user = insertUser("device-3", "tester");

    setContainerFullness("CCCCC", true, user.id);

    const report = db.prepare("SELECT * FROM reports WHERE container_code = 'CCCCC'").get() as any;
    expect(report).toBeTruthy();
    expect(report.status).toBe("full");
    expect(report.user_id).toBe(user.id);
  });

  it("increments the user's reports_count by 1", () => {
    db.prepare("INSERT INTO containers (code, type) VALUES ('DDDDD', 'mixed')").run();
    const user = insertUser("device-4", "tester");
    expect(user.reports_count).toBe(0);

    setContainerFullness("DDDDD", false, user.id);

    const updated = findUserByDeviceId("device-4")!;
    expect(updated.reports_count).toBe(1);
  });

  it("accumulates reports_count across multiple calls", () => {
    db.prepare("INSERT INTO containers (code, type) VALUES ('EEEEE', 'paper')").run();
    const user = insertUser("device-5", "tester");

    setContainerFullness("EEEEE", true, user.id);
    setContainerFullness("EEEEE", false, user.id);
    setContainerFullness("EEEEE", true, user.id);

    const updated = findUserByDeviceId("device-5")!;
    expect(updated.reports_count).toBe(3);
  });
});

describe("deleteContainer", () => {
  it("removes the container row", () => {
    db.prepare("INSERT INTO containers (code, type) VALUES ('AAAAA', 'paper')").run();

    deleteContainer("AAAAA");

    const row = db.prepare("SELECT * FROM containers WHERE code = 'AAAAA'").get();
    expect(row).toBeUndefined();
  });

  it("keeps reports after the container is deleted", () => {
    db.prepare("INSERT INTO containers (code, type) VALUES ('AAAAA', 'paper')").run();
    const user = insertUser("device-1", "tester");
    setContainerFullness("AAAAA", true, user.id);

    deleteContainer("AAAAA");

    const report = db.prepare("SELECT * FROM reports WHERE container_code = 'AAAAA'").get();
    expect(report).toBeTruthy();
  });

  it("does not affect user report counts when deleting a container", () => {
    db.prepare("INSERT INTO containers (code, type) VALUES ('AAAAA', 'paper')").run();
    const user = insertUser("device-1", "tester");
    setContainerFullness("AAAAA", true, user.id);
    setContainerFullness("AAAAA", false, user.id);

    deleteContainer("AAAAA");

    const updated = findUserByDeviceId("device-1")!;
    expect(updated.reports_count).toBe(2);
  });
});

describe("setContainerStatus", () => {
  it("sets isFull to true without creating a report", () => {
    db.prepare("INSERT INTO containers (code, type) VALUES ('AAAAA', 'paper')").run();

    setContainerStatus("AAAAA", true);

    const row = db.prepare("SELECT isFull FROM containers WHERE code = 'AAAAA'").get() as { isFull: number };
    expect(row.isFull).toBe(1);
    const report = db.prepare("SELECT * FROM reports WHERE container_code = 'AAAAA'").get();
    expect(report).toBeUndefined();
  });

  it("sets isFull to false without creating a report", () => {
    db.prepare("INSERT INTO containers (code, type, isFull) VALUES ('AAAAA', 'paper', 1)").run();

    setContainerStatus("AAAAA", false);

    const row = db.prepare("SELECT isFull FROM containers WHERE code = 'AAAAA'").get() as { isFull: number };
    expect(row.isFull).toBe(0);
    const report = db.prepare("SELECT * FROM reports WHERE container_code = 'AAAAA'").get();
    expect(report).toBeUndefined();
  });
});

describe("clearContainerLocation", () => {
  it("sets lat and lng to null", () => {
    db.prepare("INSERT INTO containers (code, type, lat, lng) VALUES ('AAAAA', 'paper', 52.37, 4.89)").run();

    clearContainerLocation("AAAAA");

    const row = db.prepare("SELECT lat, lng FROM containers WHERE code = 'AAAAA'").get() as { lat: number | null; lng: number | null };
    expect(row.lat).toBeNull();
    expect(row.lng).toBeNull();
  });

  it("updates updatedAt when clearing location", () => {
    db.prepare("INSERT INTO containers (code, type, lat, lng) VALUES ('AAAAA', 'paper', 52.37, 4.89)").run();

    clearContainerLocation("AAAAA");

    const row = db.prepare("SELECT updatedAt FROM containers WHERE code = 'AAAAA'").get() as { updatedAt: string | null };
    expect(row.updatedAt).not.toBeNull();
  });
});
