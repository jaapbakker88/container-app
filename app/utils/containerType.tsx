import { GlassWater, Layers2, Newspaper, Package } from "lucide-react";
import type { ContainerType } from "~/types/definitions";

export const CONTAINER_TYPE_CONFIG: Record<
  ContainerType["type"],
  {
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bg: string;
  }
> = {
  paper: {
    label: "Paper",
    Icon: Newspaper,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/40",
  },
  plastic: {
    label: "Plastic",
    Icon: Package,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/40",
  },
  glass: {
    label: "Glass",
    Icon: GlassWater,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
  },
  mixed: {
    label: "Mixed",
    Icon: Layers2,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/40",
  },
};

export function ContainerTypeTag({
  type,
  showLabel = true,
}: {
  type: ContainerType["type"];
  showLabel?: boolean;
}) {
  const config = CONTAINER_TYPE_CONFIG[type];
  if (!config) return null;
  const { label, Icon, color, bg } = config;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color} ${bg}`}
    >
      <Icon size={11} />
      {showLabel && label}
    </span>
  );
}
