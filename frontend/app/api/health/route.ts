import { NextResponse } from "next/server";

// Healthcheck deploy Railway: deploy baru baru menerima trafik setelah rute ini
// menjawab 2xx. Sengaja tidak memanggil sumber eksternal (FIRMS, Open-Meteo, S3)
// supaya deploy tidak gagal hanya karena penyedia data sedang down.

export function GET() {
  return NextResponse.json({ status: "ok" });
}
