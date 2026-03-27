import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useRouteLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { useEffect, useState } from "react";

import { isValidContainerId } from "~/utils/generateId";

import type { ContainerType } from "~/types/definitions";
import { haversineKm } from "~/utils/haversineKm";
import QRCode from "~/components/QRCode";
import Tag from "~/components/Tag";
import { motion, type PanInfo } from "motion/react";
import { getOrCreateUser } from "~/db/sqlite.server";

type NearbyContainer = ContainerType & { distanceKm: number };

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = getOrCreateUser(request);
  const { addLocationToContainer, getOrCreateContainer, setContainerFullness } =
    await import("~/db/sqlite.server");

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

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { getContainers, getContainer, getOrCreateContainer } =
    await import("~/db/sqlite.server");

  const code = params.containerId;
  if (!code || !isValidContainerId(code)) {
    throw new Response("Not found", { status: 404 });
  }

  // Auto-create on valid IDs to allow self-registration
  const { container, reports } =
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

  return {
    container,
    reports,
    containerUrl,
    staticMapUrl,
    mapAttribution,
    nearby,
  };
}

export default function Container() {
  const {
    container,
    reports,
    containerUrl,
    staticMapUrl,
    mapAttribution,
    nearby,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { user } = useRouteLoaderData("root");
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

  useEffect(() => {
    setPanelVisible(true);
    setThanks(false);
    setShowNearby(container.isFull === 1);
  }, [container.code]);

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (info.offset.y > 40 || info.velocity.y > 500) {
      setPanelVisible(false);
    } else {
      setPanelVisible(true);
    }
  };

  const handleHandleClick = () => {
    setPanelVisible((prev) => !prev);
  };
  return (
    <div className="fixed inset-0 flex justify-center bg-gray-50">
      <div className="relative w-full max-w-3xl flex flex-col h-full overflow-hidden">
        <header className="py-3 px-4 flex items-center justify-between">
          <Link to="/" className="text-blue-600 hover:underline text-sm">
            ← Back to overview
          </Link>

          <h1 className="font-bold text-base text-black/90">bin mate</h1>
        </header>
        <div className="p-4 flex items-center">
          {thanks ? (
            <p className="text-sm font-semibold text-gray-500 text-center text-balanced px-8">
              Success! Thank you for keeping the neighborhood clean!
            </p>
          ) : (
            <p className="text-sm font-semibold text-gray-500 text-center text-balanced px-8">
              Quick update? Mark this bin full or empty to help others find the
              right spot.
            </p>
          )}
        </div>
        <div className="p-4">
          <ul className="list-disc ml-4">
            {reports?.map((rep) => {
              return (
                <li key={rep.id}>
                  {rep.status} - {rep.created_at}
                </li>
              );
            })}
          </ul>
        </div>

        {showNearby && hasLocation && nearby.length > 0 ? (
          <motion.div
            className="mt-4 px-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h2 className="text-xl font-semibold text-gray-800 text-center">
              Empty containers nearby
            </h2>
            <ul className="mt-3 space-y-2">
              {nearby.map((item) => (
                <li
                  key={item.code}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <Link to={`/${item.code}`}>
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-gray-400">{item.code}</p>
                      {item.isFull ? (
                        <Tag type="danger">Full</Tag>
                      ) : (
                        <Tag type="success">Empty</Tag>
                      )}
                    </div>
                    <div className="text-sm text-gray-700">
                      {item.distanceKm.toFixed(2)} km away • type: {item.type}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
        <motion.div
          className="flex flex-col bg-white rounded-t-[20px] overflow-auto absolute bottom-0 z-10 w-full"
          style={{
            boxShadow: "0 -3px 3px 0 rgba(0,0,0,0.05)",
            touchAction: "pan-y",
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={
            panelVisible
              ? { y: 0, opacity: 1 }
              : { y: "calc(100% - 24px)", opacity: 1 }
          }
          transition={{ duration: 0.35, ease: "easeInOut" }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 180 }}
          dragElastic={0.08}
          onDragEnd={handleDragEnd}
        >
          <div className="w-full flex justify-center pt-3 pb-2">
            <motion.div
              className="h-[5px] w-[60px] rounded-full bg-gray-300 cursor-pointer"
              onClick={handleHandleClick}
              drag="y"
              dragConstraints={{ top: 0, bottom: 140 }}
              dragElastic={0.12}
              onDragEnd={handleDragEnd}
            />
          </div>
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
        </motion.div>
      </div>
    </div>
  );
}
