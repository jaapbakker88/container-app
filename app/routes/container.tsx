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
  setContainerFullness,
} from "~/db/sqlite";

import { isValidContainerId } from "~/utils/generateId";

import type { ContainerType } from "~/types/definitions";
import { haversineKm } from "~/utils/haversineKm";
import QRCode from "~/components/QRCode";
import Tag from "~/components/Tag";
import { motion } from "motion/react";

type NearbyContainer = ContainerType & { distanceKm: number };

export async function action({ request, params }: ActionFunctionArgs) {
  const code = params.containerId;
  if (!code || !isValidContainerId(code)) {
    throw new Response("Not found", { status: 404 });
  }

  // Ensure container exists if a valid code is used.
  getOrCreateContainer(code, "paper");

  const formData = await request.formData();

  const intent = formData.get("intent")?.toString() ?? "location";

  if (intent === "fullness") {
    const fullness = formData.get("fullness")?.toString();
    if (fullness !== "full" && fullness !== "empty") {
      return { error: "Please choose full or empty." };
    }

    setContainerFullness(code, fullness === "full");
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
      .slice(0, 5);
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
    }
  }, [actionData]);

  const displayText = thanks ? "Success! Thank you." : "";

  return (
    <>
      <div className="max-w-3xl mx-auto flex flex-col h-[100dvh] justify-between bg-white/90 overflow-hidden">
        <header className="mb-4 py-3 px-4 flex items-center justify-between">
          <Link to="/" className="text-blue-600 hover:underline text-sm">
            ← Back to containers
          </Link>

          <h1 className="font-bold text-base text-black/90">bin mate</h1>
        </header>
        <div className="flex-1 p-4 flex items-center justify-center">
          <p className="text-sm font-semibold text-gray-500">{displayText}</p>
        </div>

        <motion.div
          className="flex flex-col bg-white rounded-b rounded-[20px] overflow-auto"
          style={{ boxShadow: "0 -3px 2px 1px rgba(0,0,0,0.03" }}
          initial={{ y: 0, opacity: 1 }}
          animate={
            panelVisible ? { y: 0, opacity: 1 } : { y: "105%", opacity: 0 }
          }
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <div className="text-black px-4 py-3">
            <div className="flex justify-between items-center">
              <p>ID: {container.code}</p>
              {mapsUrl ? (
                <p className="text-xs">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-blue-600 hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </p>
              ) : null}
            </div>

            <p>
              Container status:{" "}
              {container.isFull ? (
                <Tag type="danger">Full</Tag>
              ) : (
                <Tag type="success">Empty</Tag>
              )}
            </p>
          </div>
          <div
            className="w-full border overflow-hidden"
            style={{ aspectRatio: "16 / 9" }}
          >
            {staticMapUrl ? (
              <img
                src={staticMapUrl}
                alt="Nearby containers map"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <p className="text-sm text-gray-700">
                  No location yet — add it to enable status.
                </p>
              </div>
            )}
          </div>
          {hasLocation ? (
            <div className="w-full flex">
              <Form method="post" className="w-full">
                <input type="hidden" name="intent" value="fullness" />
                <input type="hidden" name="fullness" value="full" />
                <button
                  type="submit"
                  className="block w-full bg-rose-600 px-3 py-4 text-white hover:bg-rose-700"
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
                  className="block w-full bg-emerald-700 px-3 py-4 text-white hover:bg-emerald-900"
                  disabled={container.isFull === 0}
                >
                  Mark empty
                </button>
              </Form>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isFindingLoc}
              className="block w-full bg-emerald-700 px-3 py-4 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isFindingLoc ? "Finding location..." : "Use my location"}
            </button>
          )}
          {/* <QRCode container={container} containerUrl={containerUrl} /> */}

          {/* {hasLocation && nearby.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-xl font-semibold">Closest empty containers</h2>
          <ul className="mt-3 space-y-2">
            {nearby.map((item) => (
              <li key={item.code} className="border rounded px-3 py-2">
                <Link to={"/" + item.code}>
                  <div className="font-medium">{item.code}</div>
                  <div className="text-sm text-gray-700">
                    {item.distanceKm.toFixed(2)} km away • type: {item.type}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null} */}
        </motion.div>
      </div>
    </>
  );
}
