import type { Metadata } from "next";

import FloodView from "@/components/flood/FloodView";

export const metadata: Metadata = {
  title: "Banjir Aceh & Sumatera Utara 2025",
  description:
    "Deteksi genangan banjir akhir November 2025 di Aceh dan Sumatera Utara dari perubahan backscatter Sentinel-1 musim kering vs saat banjir.",
};

export default function BanjirPage() {
  return <FloodView />;
}
