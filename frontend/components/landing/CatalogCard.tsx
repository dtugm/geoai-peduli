import Link from "next/link";
import { ArrowRight, CalendarRange, MapPin } from "lucide-react";

import { CatalogIcon, StatusBadge } from "./CatalogBits";

import { CatalogItem } from "@/constant/catalog.constant";

export default function CatalogCard({ item }: { item: CatalogItem }) {
  return (
    <Link
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-primary"
      href={`/katalog/${item.slug}`}
    >
      <div className="relative h-52 overflow-hidden bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={item.imageCaption}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
          src={item.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
        <div className="absolute left-4 top-4">
          <StatusBadge status={item.status} />
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <CatalogIcon icon={item.icon} size={16} />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/90">{item.category}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.summary}</p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={13} />
            {item.region}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange size={13} />
            {item.period}
          </span>
        </div>

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Lihat selengkapnya
          <ArrowRight className="transition group-hover:translate-x-1" size={16} />
        </span>
      </div>
    </Link>
  );
}
