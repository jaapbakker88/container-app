import type { Route } from "./+types/home";
import { addContainer, getContainers } from "~/db/sqlite";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { generateId } from "~/utils/generateId";
import type { ContainerType } from "~/types/definitions";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BINMATE" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader({ params }: LoaderFunctionArgs) {
  const containers = getContainers();
  return { containers };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  for (let i = 0; i < 5; i++) {
    const code = generateId();
    const result = addContainer(code, null, null);
    if (result.changes > 0) {
      return redirect(`/${code}`);
    }
  }

  return { error: "Could not create a container. Please try again." };
}

export default function Home() {
  const { containers } = useLoaderData() as {
    containers: ContainerType[];
  };
  const actionData = useActionData<typeof action>();

  return (
    <div className="container mx-auto">
      <div className="max-w-3xl mx-auto mt-16">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-bold text-2xl">Registered Containers</h1>
          <Form method="post" className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Register new container
            </button>
          </Form>
        </div>

        {actionData?.error ? (
          <p className="text-red-500 text-sm mt-2">{actionData.error}</p>
        ) : null}

        <ul className="mt-8">
          {containers.map((container) => (
            <li
              className="p-1 px-2 bg-white/10 mt-1 rounded-sm text-sm hover:bg-white/7"
              key={container.code}
            >
              <Link to={container.code} className=" flex gap-2">
                <div>{container.code}</div>
                <div>
                  {container.lat}, {container.lng}
                </div>
                <div>{container.type}</div>
                <div>{container.isFull}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <footer className="max-w-3xl mx-auto mt-12 border-t border-white/10 pt-6 text-sm text-gray-700 space-y-2">
        <div>
          <h2 className="font-semibold text-gray-900">About</h2>
          <p>
            BINMATE helps track recycling containers and their status across
            locations so you always know where to drop off materials.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Privacy</h2>
          <p>
            We do not store any personal user data. Location entries are tied
            only to containers.
          </p>
        </div>
      </footer>
    </div>
  );
}
