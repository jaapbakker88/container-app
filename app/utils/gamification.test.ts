import { beforeEach, describe, expect, it } from "vitest";
import { db, insertUser } from "~/db/sqlite";
import { getUserDailyStreak } from "./gamification";

beforeEach(() => {
  db.exec("DELETE FROM reports; DELETE FROM users; DELETE FROM containers;");
  db.prepare("INSERT INTO containers (code, type) VALUES ('XXXXX', 'paper')").run();
});

function reportOnDay(userId: number, day: string) {
  db.prepare(
    "INSERT INTO reports (container_code, status, user_id, created_at) VALUES ('XXXXX', 'empty', ?, ?)"
  ).run(userId, `${day} 10:00:00`);
}

describe("getUserDailyStreak", () => {
  it("returns 0 for a user with no reports", () => {
    const user = insertUser("u0", "tester");
    expect(getUserDailyStreak(user.id)).toBe(0);
  });

  it("returns 1 for a single report", () => {
    const user = insertUser("u1", "tester");
    reportOnDay(user.id, "2026-03-28");
    expect(getUserDailyStreak(user.id)).toBe(1);
  });

  it("returns 2 for reports on two consecutive days", () => {
    const user = insertUser("u2", "tester");
    reportOnDay(user.id, "2026-03-27");
    reportOnDay(user.id, "2026-03-28");
    expect(getUserDailyStreak(user.id)).toBe(2);
  });

  it("returns 1 when there is a gap between the two most recent days", () => {
    const user = insertUser("u3", "tester");
    reportOnDay(user.id, "2026-03-25");
    reportOnDay(user.id, "2026-03-28"); // gap on 26 and 27
    expect(getUserDailyStreak(user.id)).toBe(1);
  });

  it("returns the length of the most recent consecutive run, ignoring older runs", () => {
    const user = insertUser("u4", "tester");
    reportOnDay(user.id, "2026-03-20");
    reportOnDay(user.id, "2026-03-21");
    // gap
    reportOnDay(user.id, "2026-03-26");
    reportOnDay(user.id, "2026-03-27");
    reportOnDay(user.id, "2026-03-28");
    expect(getUserDailyStreak(user.id)).toBe(3);
  });

  it("counts multiple reports on the same day as 1 streak day", () => {
    const user = insertUser("u5", "tester");
    reportOnDay(user.id, "2026-03-28");
    reportOnDay(user.id, "2026-03-28"); // second report same day
    expect(getUserDailyStreak(user.id)).toBe(1);
  });

  it("returns 0 with requireToday=true when the last report is not today", () => {
    const user = insertUser("u6", "tester");
    reportOnDay(user.id, "2020-01-01");
    expect(getUserDailyStreak(user.id, true)).toBe(0);
  });
});
