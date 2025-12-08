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
      className={clsx("px-2 px-1 text-xs font-semibold rounded-sm border", {
        ["bg-teal-100 border-teal-200 text-teal-900"]: type === "success",
        ["bg-red-100 border-red-200 text-red-900"]: type === "danger",
      })}
    >
      {children}
    </span>
  );
}

export default Tag;
