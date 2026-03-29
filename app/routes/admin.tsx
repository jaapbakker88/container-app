import { useState } from "react";
import { Filter, X } from "lucide-react";
import {
  data,
  Form,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { createHash } from "crypto";
import {
  clearContainerLocation,
  deleteContainer,
  getContainers,
  setContainerStatus,
} from "~/db/sqlite";
import { parseCookies } from "~/utils/parseCookies";
import type { ContainerType } from "~/types/definitions";
import { ContainerTypeTag } from "~/utils/containerType";
import Tag from "~/components/Tag";

export function meta() {
  return [{ title: "Admin — BINMATE" }];
}

const COOKIE_NAME = "admin_token";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 h

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getExpectedToken() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return sha256(pw);
}

function isAuthed(request: Request) {
  const token = getExpectedToken();
  if (!token) return false;
  const cookies = parseCookies(request.headers.get("Cookie"));
  return cookies[COOKIE_NAME] === token;
}

function adminCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export function loader({ request }: LoaderFunctionArgs) {
  if (!getExpectedToken()) {
    throw new Response("Not found", { status: 404 });
  }

  if (!isAuthed(request)) {
    return { authed: false, bins: [] as ContainerType[] };
  }

  const bins = getContainers().sort((a, b) => {
    if (!a.updatedAt && !b.updatedAt) return 0;
    if (!a.updatedAt) return 1;
    if (!b.updatedAt) return -1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
  // Reissue cookie on every authenticated load so stale Path=/admin cookies get upgraded to Path=/
  return data(
    { authed: true, bins },
    { headers: { "Set-Cookie": adminCookie(getExpectedToken()!) } }
  );
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  if (!getExpectedToken()) {
    throw new Response("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  // Login
  if (intent === "login") {
    const submitted = formData.get("password")?.toString() ?? "";
    const token = getExpectedToken()!;
    if (sha256(submitted) !== token) {
      return { error: "Wrong password." };
    }
    return redirect("/admin", {
      headers: { "Set-Cookie": adminCookie(token) },
    });
  }

  // All other intents require auth
  if (!isAuthed(request)) {
    return redirect("/admin");
  }

  const code = formData.get("code")?.toString() ?? "";

  if (intent === "markFull") {
    setContainerStatus(code, true);
  } else if (intent === "markEmpty") {
    setContainerStatus(code, false);
  } else if (intent === "clearLocation") {
    clearContainerLocation(code);
  } else if (intent === "delete") {
    deleteContainer(code);
  }

  return redirect("/admin");
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Admin() {
  const { authed, bins } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [orphanedOnly, setOrphanedOnly] = useState(false);

  if (!authed) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4">
        <div className="w-full max-w-xs">
          <h1 className="font-bold text-xl text-gray-900 dark:text-white mb-6 text-center">
            Admin
          </h1>
          <Form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="intent" value="login" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoFocus
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {actionData && "error" in actionData ? (
              <p className="text-sm text-red-500">{actionData.error}</p>
            ) : null}
            <button
              type="submit"
              className="rounded-xl bg-gray-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
            >
              Sign in
            </button>
          </Form>
        </div>
      </div>
    );
  }

  const orphanedCount = bins.filter((b) => b.lat == null).length;
  const displayBins = orphanedOnly ? bins.filter((b) => b.lat == null) : bins;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-bold text-2xl text-gray-900 dark:text-white mb-1">
        Admin
      </h1>
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {bins.length} bin{bins.length !== 1 ? "s" : ""} registered
        </p>
        {orphanedCount > 0 && (
          <button
            onClick={() => setOrphanedOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              orphanedOnly
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400"
            }`}
          >
            {orphanedOnly ? (
              <>
                <X size={11} strokeWidth={2.5} />
                No location only
              </>
            ) : (
              <>
                <Filter size={11} strokeWidth={2.5} />
                {orphanedCount} without location
              </>
            )}
          </button>
        )}
      </div>

      {displayBins.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {orphanedOnly ? "No orphaned bins." : "No bins registered yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {displayBins.map((bin) => (
            <div
              key={bin.code}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
            >
              {/* Info */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-mono font-semibold text-sm text-gray-900 dark:text-white">
                  {bin.code}
                </span>
                <ContainerTypeTag type={bin.type} showLabel={false} />
                {bin.isFull ? (
                  <Tag type="danger">Full</Tag>
                ) : (
                  <Tag type="success">Empty</Tag>
                )}
                {bin.lat == null ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    no location
                  </span>
                ) : null}
                {bin.updatedAt ? (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto sm:ml-0">
                    {bin.updatedAt.slice(0, 10)}
                  </span>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {bin.isFull ? (
                  <AdminAction code={bin.code} intent="markEmpty" label="Mark empty" />
                ) : (
                  <AdminAction code={bin.code} intent="markFull" label="Mark full" />
                )}
                {bin.lat != null ? (
                  <AdminAction
                    code={bin.code}
                    intent="clearLocation"
                    label="Clear location"
                  />
                ) : null}
                <AdminAction
                  code={bin.code}
                  intent="delete"
                  label="Delete"
                  danger
                  confirm={`Delete bin ${bin.code}? This will also delete all reports for this bin.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminAction({
  code,
  intent,
  label,
  danger = false,
  confirm: confirmMsg,
}: {
  code: string;
  intent: string;
  label: string;
  danger?: boolean;
  confirm?: string;
}) {
  return (
    <Form
      method="post"
      onSubmit={
        confirmMsg
          ? (e) => {
              if (!window.confirm(confirmMsg)) e.preventDefault();
            }
          : undefined
      }
    >
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="code" value={code} />
      <button
        type="submit"
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          danger
            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
      >
        {label}
      </button>
    </Form>
  );
}
