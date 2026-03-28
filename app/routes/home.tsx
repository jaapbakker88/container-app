import type { Route } from "./+types/home";
import { getContainers } from "~/db/sqlite";
import {
  Link,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { useState, type FormEvent } from "react";
import { haversineKm } from "~/utils/haversineKm";
import type { ContainerType } from "~/types/definitions";
import Tag from "~/components/Tag";
import { ContainerTypeTag } from "~/utils/containerType";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BINMATE" },
    { name: "description", content: "Find empty recycling bins near you." },
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
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSearching, setAddressSearching] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const findNearbyFromCoords = (latitude: number, longitude: number) => {
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
  };

  const handleAddressSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!addressQuery.trim()) return;
    setAddressSearching(true);
    setAddressError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery.trim())}&format=json&limit=1`
      );
      const data = await res.json();
      if (!data.length) {
        setAddressError("Address not found. Try a more specific search.");
        return;
      }
      findNearbyFromCoords(parseFloat(data[0].lat), parseFloat(data[0].lon));
      setLocError(null);
    } catch {
      setAddressError("Search failed. Please try again.");
    } finally {
      setAddressSearching(false);
    }
  };

  const handleFindNearby = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("Geolocation is not available in this browser.");
      return;
    }
    setLocError(null);
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        findNearbyFromCoords(coords.latitude, coords.longitude);
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
    <div className="min-h-[100dvh] flex flex-col max-w-3xl mx-auto px-4">

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
        <h1 className="font-bold text-3xl tracking-tight text-gray-900 dark:text-white">
          BINMATE
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">
          Find an empty recycling bin near you.
        </p>

        <button
          type="button"
          onClick={handleFindNearby}
          disabled={locating}
          className="mt-8 w-full max-w-xs rounded-2xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {locating ? "Locating…" : "Find bins near me"}
        </button>

        {locError ? (
          <div className="mt-4 w-full max-w-xs">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Can't get your location — try searching by address:
            </p>
            <form onSubmit={handleAddressSearch} className="flex gap-2">
              <input
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder="Postcode or address"
                className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={addressSearching || !addressQuery.trim()}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {addressSearching ? "…" : "Search"}
              </button>
            </form>
            {addressError ? (
              <p className="text-red-500 dark:text-red-400 text-xs mt-2">{addressError}</p>
            ) : null}
          </div>
        ) : null}

        {/* Results */}
        {nearbyEmpty !== null ? (
          <div className="w-full mt-8 text-left">
            {nearbyEmpty.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                No empty bins found nearby.
              </p>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  Empty bins near you
                </p>
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
                            <span className="text-gray-300 dark:text-gray-600 text-sm">›</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Register CTA + footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Found a bin without a label?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Register it and print a QR sticker.
            </p>
          </div>
          <Link
            to="/register"
            className="shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Register a bin
          </Link>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex gap-4">
            <Link to="/profile" className="text-blue-600 dark:text-blue-400 hover:underline">
              Stats
            </Link>
            <Link to="/about" className="text-blue-600 dark:text-blue-400 hover:underline">
              About
            </Link>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Anonymous · no personal data stored
          </p>
        </div>
      </div>

    </div>
  );
}
