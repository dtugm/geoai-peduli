import type { Metadata } from "next";

import FireView from "@/components/fire/FireView";

export const metadata: Metadata = {
  title: "Pemantauan Kebakaran & Asap",
  description:
    "Peta titik api NASA FIRMS, citra Himawari, dan produk aerosol satelit untuk seluruh Indonesia.",
};

export default function KebakaranPage() {
  return <FireView />;
}
