import type { Route } from "./+types/home";
import { getContainers } from "~/db/sqlite";
import {
  Link,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { useState } from "react";
import { haversineKm } from "~/utils/haversineKm";
import type { ContainerType } from "~/types/definitions";
import Tag from "~/components/Tag";
import { ContainerTypeTag } from "~/utils/containerType";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BINMATE" },
    { name: "description", content: "Track recycling containers near you." },
  ];
}

export async function loader({ params }: LoaderFunctionArgs) {
  const containers = getContainers();
  return { containers };
}

type NearbyResult = ContainerType & { distanceKm: number };

export default function Home() {
  const { containers } = useLoaderData() as {
    containers: ContainerType[];
  };
  const [nearbyEmpty, setNearbyEmpty] = useState<NearbyResult[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const handleFindNearby = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("Geolocation is not available in this browser.");
      return;
    }
    setLocError(null);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        const results = containers
          .filter(
            (c): c is ContainerType & { lat: number; lng: number } =>
              c.lat != null && c.lng != null && c.isFull === 0
          )
          .map((c) => ({
            ...c,
            distanceKm: haversineKm(latitude, longitude, c.lat, c.lng),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 5);
        setNearbyEmpty(results);
        setLocating(false);
      },
      (err) => {
        setLocError(err.message || "Could not get location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-3xl mx-auto pt-10 pb-4">
        <h1 className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white">
          Containers
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          All registered BINMATE containers
        </p>

        <div className="flex items-center gap-3 mt-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            + Register new container
          </Link>
          <button
            type="button"
            onClick={handleFindNearby}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {locating ? "Locating…" : "Find empty bins near me"}
          </button>
        </div>

        {locError ? (
          <p className="text-red-500 dark:text-red-400 text-sm mt-2">
            {locError}
          </p>
        ) : null}

        {nearbyEmpty !== null ? (
          <div className="mt-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Empty bins near you
            </h2>
            {nearbyEmpty.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No empty bins found nearby.
              </p>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3">
                <ul className="space-y-2">
                  {nearbyEmpty.map((item) => (
                    <li key={item.code}>
                      <Link
                        to={item.code}
                        className="flex items-center justify-between rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">
                            {item.code}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                            {item.distanceKm.toFixed(2)} km away
                            <ContainerTypeTag type={item.type} />
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Tag type="success">Empty</Tag>
                          <span className="text-gray-300 dark:text-gray-600 text-sm">
                            ›
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-3 mt-6">
          <ul className="space-y-2">
            {containers.map((container) => (
              <li key={container.code}>
                <Link
                  to={container.code}
                  className="flex items-center justify-between rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {container.code}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                      {container.lat != null ? "Location set" : "No location"}
                      <ContainerTypeTag type={container.type} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {container.isFull ? (
                      <Tag type="danger">Full</Tag>
                    ) : (
                      <Tag type="success">Empty</Tag>
                    )}
                    <span className="text-gray-300 dark:text-gray-600 text-sm">
                      ›
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="max-w-3xl mx-auto mt-12 border-t border-gray-200 dark:border-gray-800 pt-6 text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <div className="flex gap-4">
          <Link to="/profile" className="text-blue-600 dark:text-blue-400 hover:underline">
            My profile
          </Link>
          <Link to="/about" className="text-blue-600 dark:text-blue-400 hover:underline">
            About
          </Link>
        </div>
        <div className="mt-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Privacy
          </h2>
          <p>
            We only store an anonymous device ID in a cookie to track your
            contributions. No personal data is collected.
          </p>
        </div>
      </footer>
    </div>
  );
}
