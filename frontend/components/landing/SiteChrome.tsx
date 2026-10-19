import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link className="flex items-center gap-3" href="/">
          <Image
            alt="GeoAIT"
            className="h-7 w-auto object-contain"
            height={28}
            src="/geoait.png"
            width={96}
          />
          <span className="hidden border-l border-white/20 pl-3 text-sm font-semibold text-white sm:inline">
            GeoAI Peduli
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            className="rounded-lg px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            href="/#katalog"
          >
            Yang dipantau
          </Link>
          <Link
            className="hidden rounded-lg px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white sm:inline"
            href="/#metode"
          >
            Cara membantu
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-semibold text-slate-700">GeoAI Peduli</span> ·
          GeoAIT, Universitas Gadjah Mada
        </p>
        <p className="text-xs">
          Citra dasar: Sentinel-2 cloudless oleh EOX IT Services (data
          Copernicus).
        </p>
      </div>
    </footer>
  );
}
