import clsx from "clsx";

function Tag({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "success" | "danger";
}) {
  return (
    <span
      className={clsx("px-2 py-0.5 text-xs font-semibold rounded-full border", {
        ["bg-teal-100 border-teal-200 text-teal-900 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-300"]:
          type === "success",
        ["bg-red-100 border-red-200 text-red-900 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300"]:
          type === "danger",
      })}
    >
      {children}
    </span>
  );
}

export default Tag;
