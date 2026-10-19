"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

import CatalogCard from "./CatalogCard";

import { catalog, statusLabel } from "@/constant/catalog.constant";

type Filter = "all" | "live" | "development";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "live", label: statusLabel.live },
  { key: "development", label: statusLabel.development },
];

export default function CatalogGrid() {
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(
    () =>
      filter === "all"
        ? catalog
        : catalog.filter((item) => item.status === filter),
    [filter],
  );

  return (
    <div>
      {/* Filter status baru berguna kalau ada lebih dari satu status */}
      {new Set(catalog.map((item) => item.status)).size > 1 && (
      <div className="mb-6 flex flex-wrap gap-2" role="tablist">
        {filters.map(({ key, label }) => {
          const count =
            key === "all"
              ? catalog.length
              : catalog.filter((item) => item.status === key).length;

          if (count === 0) return null;

          return (
            <button
              key={key}
              aria-selected={filter === key}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                filter === key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
              )}
              role="tab"
              type="button"
              onClick={() => setFilter(key)}
            >
              {label}
              <span
                className={clsx(
                  "ml-1.5 text-xs",
                  filter === key ? "text-white/60" : "text-slate-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <CatalogCard key={item.slug} item={item} />
        ))}
      </div>
    </div>
  );
}
