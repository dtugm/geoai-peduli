import type { Metadata } from "next";

import LandCoverView from "@/components/landcover/LandCoverView";

export const metadata: Metadata = {
  title: "Tutupan Lahan Sumatra",
  description: "Pemantauan hutan, kebun sawit, dan lahan terbangun di Aceh, Sumatera Utara, dan Sumatera Barat.",
};

export default function TutupanLahanPage() {
  return <LandCoverView />;
}
