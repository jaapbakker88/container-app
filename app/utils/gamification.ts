import { db } from "~/db/sqlite.server";

/**
 * Compute the current daily streak (in days) for a user based on report dates.
 * A streak counts unique report days and continues backwards from the most recent report day.
 * If you want to require a report today to be counted, set requireToday = true.
 */
export function getUserDailyStreak(userId: number, requireToday = false): number {
  const rows = db
    .prepare(
      `
      WITH days AS (
        SELECT date(created_at) AS day
        FROM reports
        WHERE user_id = ?
        GROUP BY date(created_at)
        ORDER BY day DESC
      ),
      runs AS (
        SELECT
          day,
          ROW_NUMBER() OVER (ORDER BY day DESC) AS rn
        FROM days
      ),
      grouped AS (
        SELECT
          day,
          date(day, printf('-%d day', rn)) AS grp
        FROM runs
      )
      SELECT day, grp FROM grouped
      ORDER BY day DESC;
      `
    )
    .all(userId) as { day: string; grp: string }[];

  if (rows.length === 0) {
    return 0;
  }

  // If requiring today, bail if latest day isn't today.
  const latestDay = rows[0].day;
  if (requireToday && latestDay !== new Date().toISOString().slice(0, 10)) {
    return 0;
  }

  const currentGroup = rows[0].grp;
  return rows.filter((r) => r.grp === currentGroup).length;
}
