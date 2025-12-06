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
import { useState } from "react";
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
    return redirect(`/${code}`);
  }

  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Please provide valid latitude and longitude." };
  }

  addLocationToContainer(lat, lng, code);
  return redirect(`/${code}`);
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

  const hasLocation = container.lat != null && container.lng != null;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    containerUrl
  )}`;

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

  return (
    <div className="max-w-3xl mx-auto mt-16">
      <div className="mb-4">
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          ← Back to containers
        </Link>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">{container.code}</h1>
        </div>
        {hasLocation ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700">
              Bin status: {container.isFull ? "Full" : "Empty"}
            </span>
            <Form method="post" className="flex gap-2">
              <input type="hidden" name="intent" value="fullness" />
              <input type="hidden" name="fullness" value="full" />
              <button
                type="submit"
                className="inline-flex items-center rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                disabled={container.isFull === 1}
              >
                Mark full
              </button>
            </Form>
            <Form method="post" className="flex gap-2">
              <input type="hidden" name="intent" value="fullness" />
              <input type="hidden" name="fullness" value="empty" />
              <button
                type="submit"
                className="inline-flex items-center rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                disabled={container.isFull === 0}
              >
                Mark empty
              </button>
            </Form>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="text-sm text-gray-700">
              No location yet — add it to enable status.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isFindingLoc}
                className="inline-flex items-center rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {isFindingLoc ? "Finding location..." : "Use my location"}
              </button>
            </div>
          </div>
        )}
      </div>

      {container.lat != null && container.lng != null ? (
        <div className="mt-10">
          <h2 className="text-xl font-semibold">Location</h2>
          <div>
            <p className="text-gray-700">
              Saved location: {container.lat}, {container.lng}{" "}
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-blue-600 hover:underline"
                >
                  Open in Google Maps
                </a>
              ) : null}
            </p>
            {staticMapUrl ? (
              <div className="mt-4">
                <img
                  src={staticMapUrl}
                  alt="Static map preview"
                  className="w-full rounded border"
                />
                {mapAttribution ? (
                  <p className="text-xs text-gray-500">{mapAttribution}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-1">{container.code}</h2>
        <img
          src={qrSrc}
          alt={`QR code for ${containerUrl}`}
          className="w-84 h- mt-4"
        />
      </div>

      {hasLocation && nearby.length > 0 ? (
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
      ) : null}
    </div>
  );
}
