import { Flame, Trees, Waves } from "lucide-react";
import clsx from "clsx";

import {
  CatalogIcon as CatalogIconKey,
  CatalogStatus,
  statusLabel,
} from "@/constant/catalog.constant";

const icons = {
  flood: Waves,
  landcover: Trees,
  fire: Flame,
};

export const iconAccent: Record<CatalogIconKey, string> = {
  flood: "bg-sky-500/15 text-sky-600",
  landcover: "bg-emerald-500/15 text-emerald-600",
  fire: "bg-orange-500/15 text-orange-600",
};

export function CatalogIcon({
  icon,
  size = 18,
  className,
}: {
  icon: CatalogIconKey;
  size?: number;
  className?: string;
}) {
  const Icon = icons[icon];

  return <Icon className={className} size={size} />;
}

export function StatusBadge({
  status,
  className,
}: {
  status: CatalogStatus;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "live"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
        className,
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          status === "live" ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      {statusLabel[status]}
    </span>
  );
}
