import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, CalendarRange, Check, ExternalLink, MapPin } from "lucide-react";

import { CatalogIcon, StatusBadge } from "@/components/landing/CatalogBits";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { catalog, getCatalogItem } from "@/constant/catalog.constant";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return catalog.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const item = getCatalogItem((await params).slug);

  return item ? { title: item.title, description: item.summary } : {};
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
    </div>
  );
}

export default async function CatalogDetailPage({ params }: { params: Params }) {
  const item = getCatalogItem((await params).slug);

  if (!item) notFound();

  const available = item.analyses.filter((a) => a.status !== "planned");
  const planned = item.analyses.filter((a) => a.status === "planned");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      {/* HEADER BERGAMBAR ------------------------------------------------------ */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={item.imageCaption} className="absolute inset-0 -z-10 h-full w-full object-cover" src={item.image} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-white/70 transition hover:text-white"
            href="/#katalog"
          >
            <ArrowLeft size={15} /> Semua isu
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusBadge status={item.status} />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/75">
              <CatalogIcon icon={item.icon} size={14} />
              {item.category}
            </span>
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">{item.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">{item.story[0]}</p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
            <span className="inline-flex items-center gap-2">
              <MapPin size={15} /> {item.region}
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarRange size={15} /> {item.period}
            </span>
          </div>
          <Link
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-xl transition hover:bg-slate-100"
            href={item.dashboard.href}
          >
            Buka dashboard <ArrowRight size={16} />
          </Link>
          <p className="mt-10 text-[11px] text-white/50">{item.imageCaption}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-16 px-4 py-16 sm:px-6">
        {/* DASHBOARD ------------------------------------------------------------- */}
        <section>
          <Link
            className="group grid overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl ring-1 ring-slate-800 transition hover:-translate-y-1 hover:shadow-2xl md:grid-cols-[1.1fr_1fr]"
            href={item.dashboard.href}
          >
            <div className="relative min-h-60 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                src={item.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent md:bg-gradient-to-r md:from-transparent md:to-slate-900" />
              {/* Bingkai "dashboard" sebagai penanda visual */}
              <div className="absolute inset-5 hidden grid-cols-[30%_1fr_26%] gap-2 opacity-90 md:grid">
                <div className="rounded-xl bg-slate-950/70 p-2 backdrop-blur">
                  {[70, 45, 85, 55].map((w, i) => (
                    <div key={i} className="mb-2 h-2 rounded-full bg-white/25" style={{ width: `${w}%` }} />
                  ))}
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-8 rounded-lg bg-white/10" />
                    ))}
                  </div>
                </div>
                <div />
                <div className="rounded-xl bg-slate-950/70 p-2 backdrop-blur">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-7 rounded-lg bg-white/10" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Dashboard</p>
              <h2 className="mt-2 text-2xl font-bold">{item.dashboard.label}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.story[1]}</p>
              <ul className="mt-5 grid gap-2 text-sm">
                {item.dashboard.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2.5 text-slate-200">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sky-400/20 text-sky-300">
                      <Check size={12} />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
              <span className="mt-7 inline-flex w-fit items-center gap-2 rounded-xl bg-[#2f80ed] px-5 py-3 text-sm font-semibold transition group-hover:bg-[#3b8cf5]">
                Buka dashboard
                <ArrowRight className="transition group-hover:translate-x-1" size={16} />
              </span>
            </div>
          </Link>
        </section>

        {/* ANALISIS ---------------------------------------------------------------- */}
        <section>
          <SectionTitle eyebrow="Analisis" title="Apa yang kami analisis" />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...available, ...planned].map((a, i) => {
              const isPlanned = a.status === "planned";

              return (
                <li
                  key={a.title}
                  className={clsx(
                    "flex flex-col rounded-2xl p-5",
                    isPlanned ? "border border-dashed border-slate-300 bg-slate-50" : "bg-white ring-1 ring-slate-200",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        "grid size-8 place-items-center rounded-xl text-sm font-bold tabular-nums",
                        isPlanned ? "bg-slate-100 text-slate-400" : "bg-primary/10 text-primary",
                      )}
                    >
                      {i + 1}
                    </span>
                    {isPlanned && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-600/20">
                        Segera hadir
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{a.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{a.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {a.sources.map((src) => (
                      <span key={src} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {src}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* SUMBER DATA -------------------------------------------------------------- */}
        <section>
          <SectionTitle eyebrow="Sumber data" title="Data terbuka yang kami gunakan" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {item.dataSources.map((src) => (
              <a
                key={src.name}
                className="group flex items-start justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-primary/40"
                href={src.url}
                rel="noreferrer"
                target="_blank"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{src.name}</p>
                  <p className="text-xs text-slate-500">{src.provider}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{src.description}</p>
                </div>
                <ExternalLink className="mt-1 shrink-0 text-slate-300 transition group-hover:text-primary" size={15} />
              </a>
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}
