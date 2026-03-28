import {
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
  return `${COOKIE_NAME}=${token}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export function loader({ request }: LoaderFunctionArgs) {
  if (!getExpectedToken()) {
    throw new Response("Not found", { status: 404 });
  }

  if (!isAuthed(request)) {
    return { authed: false, bins: [] as ContainerType[] };
  }

  const bins = getContainers().sort((a, b) => a.code.localeCompare(b.code));
  return { authed: true, bins };
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-bold text-2xl text-gray-900 dark:text-white mb-1">
        Admin
      </h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
        {bins.length} bin{bins.length !== 1 ? "s" : ""} registered
      </p>

      {bins.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No bins registered yet.
        </p>
      ) : (
        <div className="space-y-2">
          {bins.map((bin) => (
            <div
              key={bin.code}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
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
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    no location
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
                  confirm={`Delete bin ${bin.code}? Reports will be kept.`}
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
