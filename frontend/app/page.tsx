import Link from "next/link";
import { ArrowRight, HandHeart, Satellite, ScanSearch } from "lucide-react";

import CatalogGrid from "@/components/landing/CatalogGrid";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { catalog } from "@/constant/catalog.constant";

// Mosaik tile Sentinel-2 cloudless zoom 5 yang menutupi wilayah Indonesia
const heroTiles = [15, 16].flatMap((y) =>
  [24, 25, 26, 27, 28].map(
    (x) =>
      `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/5/${y}/${x}.jpg`,
  ),
);

const steps = [
  {
    icon: Satellite,
    title: "Memantau dari angkasa",
    description:
      "Satelit melintas setiap hari — menembus awan, asap, dan wilayah yang sulit dijangkau saat bencana terjadi.",
  },
  {
    icon: ScanSearch,
    title: "Membaca dampaknya",
    description:
      "Kecerdasan buatan mengubah citra menjadi peta genangan, titik api, sebaran asap, dan hutan yang hilang.",
  },
  {
    icon: HandHeart,
    title: "Membantu bergerak",
    description:
      "Peta dan angka dampak yang mudah dipahami, terbuka untuk relawan, pemerintah daerah, dan masyarakat.",
  },
];

export default function Home() {
  const liveCount = catalog.filter((item) => item.status === "live").length;
  const sourceCount = new Set(
    catalog.flatMap((item) => item.dataSources.map((source) => source.name)),
  ).size;

  const stats = [
    { value: catalog.length, label: "Isu dipantau" },
    { value: liveCount, label: "Dashboard aktif" },
    { value: "34", label: "Provinsi terpantau" },
    { value: sourceCount, label: "Sumber data terbuka" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950">
        <div
          aria-hidden
          className="absolute inset-0 flex justify-center overflow-hidden opacity-70"
        >
          <div className="grid aspect-[5/2] w-full min-w-[1600px] shrink-0 grid-cols-5">
            {heroTiles.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} alt="" className="h-full w-full" src={src} />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950" />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-36 sm:px-6 sm:pb-28 sm:pt-44">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            GeoAIT · Universitas Gadjah Mada
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Memahami dampak bencana{" "}
            <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
              melalui data geospasial.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            GeoAI Peduli memanfaatkan citra satelit dan kecerdasan buatan untuk
            mengidentifikasi serta memetakan dampak bencana. Informasi geospasial yang
            dihasilkan membantu mendukung penilaian kondisi wilayah dan penentuan
            prioritas penanganan.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:opacity-90"
              href="#katalog"
            >
              Lihat yang kami pantau
              <ArrowRight size={16} />
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
              href="#metode"
            >
              Cara kami membantu
            </Link>
          </div>

          <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-slate-950/70 px-5 py-4">
                <dt className="text-xs text-slate-400">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* KATALOG */}
      <section className="scroll-mt-8 py-20" id="katalog">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Yang kami pantau
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Bencana & isu lingkungan
            </h2>
            <p className="mt-3 text-slate-600">
              Setiap isu punya satu dashboard berisi peta dan angka dampaknya. Daftar ini
              terus bertambah seiring bencana yang perlu kita hadapi bersama.
            </p>
          </div>
          <CatalogGrid />
        </div>
      </section>

      {/* METODE */}
      <section className="scroll-mt-8 border-t border-slate-200 bg-white py-20" id="metode">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Cara kami membantu
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Dari citra satelit menjadi aksi
            </h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand text-white">
                    <step.icon size={20} />
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-300">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
