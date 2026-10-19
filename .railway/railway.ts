import { defineRailway, github, project, service } from "railway/iac";

// Infrastruktur Railway untuk GeoAI Peduli (Infrastructure as Code).
// Railway tidak membaca file ini saat deploy: perubahan baru berlaku setelah
// `railway config plan` lalu `railway config apply`. Panduan: docs/DEPLOY-RAILWAY.md

export default defineRailway(() => {
  const web = service("web", {
    source: github("dtugm/geoai-peduli", { branch: "main", rootDirectory: "frontend" }),
    build: {
      builder: "RAILPACK",
      buildCommand: "npm run build",
      // Pola dihitung dari root repo, bukan dari rootDirectory
      watchPatterns: ["/frontend/**"],
    },
    start: "npm run start",
    healthcheck: "/api/health",
    // Singapura: terdekat dengan pengguna Indonesia dan bucket S3 ap-southeast-1.
    // Cukup satu replika — /api/firms dan /api/smoke menyimpan cache di memori proses,
    // jadi tiap replika tambahan mengunduh ulang data FIRMS dan Open-Meteo sendiri.
    replicas: { "asia-southeast1-eqsg3a": 1 },
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  return project("geoai-peduli", {
    resources: [web],
  });
});
