import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { getGlobalStats, getOrCreateUser } from "~/db/sqlite";
import { getUserDailyStreak } from "~/utils/gamification";

export function meta() {
  return [{ title: "Stats — BINMATE" }];
}

export function loader({ request }: LoaderFunctionArgs) {
  const { user } = getOrCreateUser(request);
  const streak = getUserDailyStreak(user.id);
  const global = getGlobalStats();
  return { user, streak, global };
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
        {value}
      </p>
    </div>
  );
}

export default function Profile() {
  const { user, streak, global } = useLoaderData<typeof loader>();

  const lastReportFormatted = user.last_reported_at
    ? new Date(user.last_reported_at).toLocaleDateString("nl-NL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="container mx-auto max-w-3xl p-4 pt-10">
      <Link
        to="/"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
      >
        ← Back
      </Link>

      <h1 className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white mt-6">
        Stats
      </h1>

      <h2 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-6 mb-3">
        Your contributions
      </h2>
      <div className="space-y-3">
        <StatCard label="Name" value={user.name ?? "Anonymous"} />
        <StatCard label="Reports made" value={user.reports_count} />
        <StatCard
          label="Current streak"
          value={`${streak} ${streak === 1 ? "day" : "days"}`}
        />
        <StatCard
          label="Last report"
          value={lastReportFormatted ?? "No reports yet"}
        />
      </div>

      <h2 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-8 mb-3">
        Community
      </h2>
      <div className="space-y-3">
        <StatCard label="Bins registered" value={global.totalBins} />
        <StatCard label="Total reports" value={global.totalReports} />
        <StatCard
          label="Active contributors"
          value={global.activeContributors}
        />
      </div>
    </div>
  );
}
