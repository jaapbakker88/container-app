import { Link } from "react-router";

export function meta() {
  return [{ title: "About — BINMATE" }];
}

export default function About() {
  return (
    <div className="container mx-auto max-w-3xl p-4 pt-10">
      <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
        ← Back
      </Link>

      <h1 className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white mt-6">
        About BINMATE
      </h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Why BINMATE?</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Finding a recycling container with space can be frustrating. BINMATE lets
          anyone report whether a container is full or empty — so your neighbours
          always know where to go without making a wasted trip.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">How it works</h2>
        <ol className="mt-2 list-decimal ml-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>Print the QR code and stick it on the recycling container</li>
          <li>Scan the QR code to open the container page</li>
          <li>Register the container's location once (just tap "Use my location")</li>
          <li>Report full or empty every time you visit</li>
        </ol>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          That's it. No app to install, no account to create. Anyone with the link
          or QR code can contribute.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          BINMATE stores an anonymous device ID in a cookie to track your
          contributions. No name, email, or personal data is ever collected or
          required.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Relevant links</h2>
        <ul className="mt-2 list-disc ml-4 text-sm space-y-1">
          <li>
            <a
              href="https://www.amsterdam.nl/afval/afvalcontainers-kaart/"
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Afvalcontainers kaart Amsterdam
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
