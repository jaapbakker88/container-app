import type { Route } from "./+types/register";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { useEffect, useState } from "react";
import { addContainer } from "~/db/sqlite";
import { generateId } from "~/utils/generateId";
import type { ContainerType } from "~/types/definitions";
import StepIndicator from "~/components/StepIndicator";
import { CONTAINER_TYPE_CONFIG } from "~/utils/containerType";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Register a bin — BINMATE" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return { origin: url.origin };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const type = formData.get("type")?.toString();

  const validTypes = ["paper", "plastic", "glass", "mixed"];
  if (!type || !validTypes.includes(type)) {
    return { ok: false as const, error: "Please select a bin type." };
  }

  const binType = type as ContainerType["type"];

  for (let i = 0; i < 5; i++) {
    const code = generateId();
    const result = addContainer(code, null, null, binType);
    if (result.changes > 0) {
      return { ok: true as const, code, type: binType };
    }
  }

  return { ok: false as const, error: "Could not generate a code. Please try again." };
}

const BIN_TYPES: {
  type: ContainerType["type"];
  description: string;
}[] = [
  { type: "paper", description: "Newspapers, cardboard, paper packaging" },
  { type: "plastic", description: "Bottles, containers, plastic packaging" },
  { type: "glass", description: "Bottles, jars, glass containers" },
  { type: "mixed", description: "General recycling, mixed materials" },
];

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    #print-label, #print-label * { visibility: visible; }
    #print-label {
      position: fixed;
      top: 0; left: 0;
      width: 9cm; height: 9cm;
      padding: 0.5cm;
      display: flex !important;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: white;
    }
  }
`;

export default function Register() {
  const { origin } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<ContainerType["type"]>("paper");
  const [container, setContainer] = useState<{
    code: string;
    type: ContainerType["type"];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (actionData?.ok && actionData.code) {
      setContainer({ code: actionData.code, type: actionData.type });
      setStep(2);
    }
  }, [actionData]);

  const containerUrl = container ? `${origin}/${container.code}` : "";
  const qrSrc = containerUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(containerUrl)}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(containerUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col min-h-[100dvh] bg-gray-50 dark:bg-gray-950">
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <header className="py-3 px-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back
        </Link>
        <h1 className="font-bold text-base text-black/90 dark:text-white">
          bin mate
        </h1>
        <StepIndicator current={step} total={4} />
      </header>

      <div className="flex-1 px-4 pt-4 pb-10">
        {/* Step 1 — Select type */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              What type of bin is it?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Choose the recycling type that matches the bin.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              You'll need a printer. The bin must be publicly accessible.
            </p>

            <Form method="post" className="mt-6">
              <input type="hidden" name="type" value={selectedType} />
              <div className="grid grid-cols-2 gap-3">
                {BIN_TYPES.map(({ type, description }) => {
                  const { label, Icon, color, bg } = CONTAINER_TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`text-left rounded-xl border-2 p-4 transition-colors ${
                        selectedType === type
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-400"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${bg} ${color} mb-2`}>
                        <Icon size={16} />
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {actionData && !actionData.ok && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-3">
                  {actionData.error}
                </p>
              )}

              <button
                type="submit"
                className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
              >
                Generate my QR code →
              </button>
            </Form>
          </div>
        )}

        {/* Step 2 — QR code */}
        {step === 2 && container && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Your QR code is ready
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Print it and stick it on the bin — or save it for later.
            </p>

            <div className="mt-6 flex flex-col items-center">
              <img
                src={qrSrc}
                alt={`QR code for bin ${container.code}`}
                className="w-48 h-48 rounded-xl"
              />
              <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white mt-3 tracking-widest">
                {container.code}
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                {container.type}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <a
                href={qrSrc}
                download={`binmate-${container.code}.png`}
                className="flex items-center justify-center w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Save QR to device
              </a>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  No printer handy? Bookmark this link — your bin is already
                  registered. You can print the label any time.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                    {containerUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Print the label →
            </button>
          </div>
        )}

        {/* Step 3 — Print */}
        {step === 3 && container && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Print & stick
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Print the label below and stick it on the bin.
            </p>

            <div
              id="print-label"
              className="mt-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-6 flex flex-col items-center gap-2 bg-white dark:bg-gray-900"
            >
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase">
                BINMATE
              </p>
              <img
                src={qrSrc}
                alt={`QR code for bin ${container.code}`}
                className="w-44 h-44"
              />
              <p className="font-mono text-xl font-bold text-gray-900 dark:text-white tracking-widest">
                {container.code}
              </p>
              <span className="text-xs text-gray-500 capitalize">
                {container.type}
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="mt-4 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Print label
            </button>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              I've stuck it on →
            </button>
          </div>
        )}

        {/* Step 4 — Scan & set location */}
        {step === 4 && container && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              One last step
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Set the bin's location so others can find it.
            </p>

            <div className="mt-6 flex flex-col items-center">
              <img
                src={qrSrc}
                alt={`QR code for bin ${container.code}`}
                className="w-40 h-40 rounded-xl"
              />
            </div>

            <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              {[
                `Scan the QR code with your phone's camera`,
                "It will open the bin's page in BINMATE",
                `Tap "Use my location" to register where the bin is`,
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <Link
              to={`/${container.code}`}
              className="mt-6 flex items-center justify-center w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Open container page →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
