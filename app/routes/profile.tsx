import {
  Link,
  useRouteLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import Header from "~/components/Header";
import { getOrCreateUser } from "~/db/sqlite.server";
import type { UserType } from "~/types/definitions";
import { getUserDailyStreak } from "~/utils/gamification";

export function loader({ request }: LoaderFunctionArgs) {
  const { user } = getOrCreateUser(request);
  const streak = getUserDailyStreak(user.id, true);
  return { user, streak };
}

function Profile({ loaderData }) {
  const { user, streak } = loaderData;
  const lastReportFormatted = user.last_reported_at
    ? new Date(user.last_reported_at).toLocaleDateString("nl-NL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  return (
    <div>
      <Header />
      <div className="p-4">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p>Number of reports: {user.reports_count}</p>
        <p>
          Last report at{" "}
          {lastReportFormatted ? lastReportFormatted : "No reports yet"}
        </p>
        <p>Current streak: {streak}</p>
      </div>
    </div>
  );
}

export default Profile;
