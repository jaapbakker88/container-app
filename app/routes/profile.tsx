import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { getOrCreateUser } from "~/db/sqlite";
import { getUserDailyStreak } from "~/utils/gamification";

export function meta() {
  return [{ title: "My profile — BINMATE" }];
}

export function loader({ request }: LoaderFunctionArgs) {
  const { user } = getOrCreateUser(request);
  const streak = getUserDailyStreak(user.id);
  return { user, streak };
}

export default function Profile() {
  const { user, streak } = useLoaderData<typeof loader>();

  const lastReportFormatted = user.last_reported_at
    ? new Date(user.last_reported_at).toLocaleDateString("nl-NL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="container mx-auto max-w-3xl p-4 pt-10">
      <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
        ← Back
      </Link>

      <h1 className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white mt-6">
        {user.name ?? "Anonymous"}
      </h1>

      <div className="mt-6 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Total reports
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
            {user.reports_count}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Current streak
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
            {streak} {streak === 1 ? "day" : "days"}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Last report
          </p>
          <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">
            {lastReportFormatted ?? "No reports yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
