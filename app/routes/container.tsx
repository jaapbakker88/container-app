import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { useEffect, useState } from "react";
import {
  addLocationToContainer,
  getContainers,
  getContainer,
  getOrCreateContainer,
  getOrCreateUser,
  setContainerFullness,
} from "~/db/sqlite";

import { isValidContainerId } from "~/utils/generateId";

import type { ContainerType } from "~/types/definitions";
import { haversineKm } from "~/utils/haversineKm";
import Tag from "~/components/Tag";
import { motion } from "motion/react";

type NearbyContainer = ContainerType & { distanceKm: number };

function formatRelativeTime(updatedAt: string | null | undefined): string {
  if (!updatedAt) return "";
  const diff = Date.now() - new Date(updatedAt + "Z").getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

export async function action({ request, params }: ActionFunctionArgs) {
  const code = params.containerId;
  if (!code || !isValidContainerId(code)) {
    throw new Response("Not found", { status: 404 });
  }

  const { user } = getOrCreateUser(request);

  // Ensure container exists if a valid code is used.
  getOrCreateContainer(code, "paper");

  const formData = await request.formData();

  const intent = formData.get("intent")?.toString() ?? "location";

  if (intent === "fullness") {
    const fullness = formData.get("fullness")?.toString();
    if (fullness !== "full" && fullness !== "empty") {
      return { error: "Please choose full or empty." };
    }

    setContainerFullness(code, fullness === "full", user.id);
    return { intent: "fullness", updated: true, isFull: fullness === "full" };
  }

  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Please provide valid latitude and longitude." };
  }

  addLocationToContainer(lat, lng, code);
  return { intent: "location", updated: true };
}

export function loader({ params, request }: LoaderFunctionArgs) {
  const code = params.containerId;
  if (!code || !isValidContainerId(code)) {
    throw new Response("Not found", { status: 404 });
  }

  // Auto-create on valid IDs to allow self-registration
  const container =
    (getOrCreateContainer(code, "paper") as ContainerType | undefined) ??
    (getContainer(code) as ContainerType | undefined);

  if (!container) {
    return redirect("/");
  }

  const url = new URL(request.url);
  const containerUrl = `${url.origin}/${code}`;

  const apiKey = process.env.MAPS_KEY;

  const hasCoords = container.lat != null && container.lng != null;

  const staticMapUrl = hasCoords
    ? apiKey
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${container.lat},${container.lng}&zoom=16&size=640x360&scale=2&markers=color:red|${container.lat},${container.lng}&key=${apiKey}`
      : `https://staticmap.openstreetmap.de/staticmap.php?center=${container.lat},${container.lng}&zoom=16&size=1024x576&markers=${container.lat},${container.lng},lightblue1`
    : null;

  const mapAttribution =
    hasCoords && !apiKey ? "© OpenStreetMap contributors" : null;

  let nearby: NearbyContainer[] = [];
  if (hasCoords) {
    const all = getContainers() as ContainerType[];
    const candidates = all.filter(
      (c): c is ContainerType & { lat: number; lng: number } =>
        c.code !== container.code &&
        c.lat != null &&
        c.lng != null &&
        c.isFull !== 1
    );
    nearby = candidates
      .map((c) => ({
        ...c,
        distanceKm: haversineKm(
          container.lat as number,
          container.lng as number,
          c.lat,
          c.lng
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  }

  return { container, containerUrl, staticMapUrl, mapAttribution, nearby };
}

export default function Container() {
  const { container, containerUrl, staticMapUrl, mapAttribution, nearby } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const [locError, setLocError] = useState<string | null>(null);
  const [isFindingLoc, setIsFindingLoc] = useState(false);
  const [panelVisible, setPanelVisible] = useState(true);
  const [thanks, setThanks] = useState(false);
  const [showNearby, setShowNearby] = useState(container.isFull === 1);

  const hasLocation = container.lat != null && container.lng != null;

  const mapsUrl =
    container.lat != null && container.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${container.lat},${container.lng}`
      : null;

  const handleUseMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("Geolocation is not available in this browser.");
      return;
    }

    setLocError(null);
    setIsFindingLoc(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        submit(
          {
            lat: coords.latitude.toString(),
            lng: coords.longitude.toString(),
          },
          { method: "post" }
        );
        setIsFindingLoc(false);
      },
      (err) => {
        setLocError(err.message || "Could not get location.");
        setIsFindingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (actionData && actionData.intent === "fullness" && actionData.updated) {
      setPanelVisible(false);
      setThanks(true);
      setShowNearby(actionData.isFull ?? false);
    }
  }, [actionData]);

  return (
    <>
      <div className="max-w-3xl mx-auto flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <header className="mb-4 py-3 px-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to containers
          </Link>
          <h1 className="font-bold text-base text-black/90 dark:text-white">
            bin mate
          </h1>
        </header>

        <div className="flex-1 flex flex-col px-4 pb-[280px] overflow-y-auto">
          {thanks ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <p className="text-2xl mb-1">✓</p>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                Thank you!
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                You're helping keep the neighbourhood clean.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500 text-center text-balance">
                Mark this bin{" "}
                <span className="text-gray-700 dark:text-gray-300 font-semibold">
                  full or empty
                </span>{" "}
                to help others find the right spot.
              </p>
            </div>
          )}

          {showNearby && hasLocation && nearby.length > 0 ? (
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 text-center mb-3">
                Empty containers nearby
              </h2>
              <ul className="space-y-2">
                {nearby.map((item, index) => (
                  <motion.li
                    key={item.code}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.06,
                      ease: "easeOut",
                    }}
                  >
                    <Link
                      to={`/${item.code}`}
                      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 active:bg-gray-50 dark:active:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {item.code}
                        </p>
                        {item.isFull ? (
                          <Tag type="danger">Full</Tag>
                        ) : (
                          <Tag type="success">Empty</Tag>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.distanceKm.toFixed(2)} km away · {item.type}
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : null}
        </div>

        <motion.div
          className="flex flex-col bg-white dark:bg-gray-900 rounded-t-[20px] overflow-hidden absolute bottom-0 left-0 right-0"
          style={{ boxShadow: "0 -4px 20px 0 rgba(0,0,0,0.10)" }}
          initial={{ y: 0, opacity: 1 }}
          animate={
            panelVisible ? { y: 0, opacity: 1 } : { y: "105%", opacity: 0 }
          }
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <div className="px-4 pt-4 pb-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  Container
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {container.code}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Status
                  </span>
                  {container.isFull ? (
                    <Tag type="danger">Full</Tag>
                  ) : (
                    <Tag type="success">Empty</Tag>
                  )}
                </div>
                {container.updatedAt ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatRelativeTime(container.updatedAt)}
                  </p>
                ) : null}
              </div>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 dark:text-blue-400 font-medium hover:underline mt-1"
                >
                  Open in Maps →
                </a>
              ) : null}
            </div>
          </div>

          <div
            className="w-full overflow-hidden bg-gray-100 dark:bg-gray-800"
            style={{ aspectRatio: "4 / 3" }}
          >
            {staticMapUrl ? (
              <img
                src={staticMapUrl}
                alt="Container location map"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center px-6">
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center leading-snug">
                  No location set yet.
                  <br />
                  Tap below to register this container.
                </p>
              </div>
            )}
          </div>

          {hasLocation ? (
            <div className="w-full flex safe-bottom">
              <Form method="post" className="w-full">
                <input type="hidden" name="intent" value="fullness" />
                <input type="hidden" name="fullness" value="full" />
                <button
                  type="submit"
                  className="block w-full bg-rose-600 px-3 py-4 text-white font-semibold text-base hover:bg-rose-700 active:bg-rose-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={container.isFull === 1}
                >
                  Mark full
                </button>
              </Form>
              <Form method="post" className="w-full">
                <input type="hidden" name="intent" value="fullness" />
                <input type="hidden" name="fullness" value="empty" />
                <button
                  type="submit"
                  className="block w-full bg-emerald-600 px-3 py-4 text-white font-semibold text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={container.isFull === 0}
                >
                  Mark empty
                </button>
              </Form>
            </div>
          ) : (
            <div className="safe-bottom">
              {locError ? (
                <p className="text-xs text-red-500 text-center px-4 pt-2">
                  {locError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isFindingLoc}
                className="block w-full bg-emerald-600 px-3 py-4 text-white font-semibold text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isFindingLoc ? "Locating…" : "Use my location"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
