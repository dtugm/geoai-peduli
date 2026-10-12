# geoai-peduli (monorepo)

Hasil pemisahan web GeoAI-Peduli dari `hgu-geoait` (hanya viewer publik UGM).

```
geoai-peduli/
├── frontend/   # Next.js 15 App Router — viewer publik
│               # rute: /aceh, /acehDampak, /sumbar, /sumut, /sumutEpochAnalysis
│               # jalankan: cd frontend && npm install && npm run dev
└── backend/    # TODO — placeholder, belum dibutuhkan
```

## Frontend

```bash
cd frontend
npm install
npm run dev    
npm run build
```

Deploy (Vercel / Cloud Run): Root Directory = `frontend`.
Domain `ugmpeduli.geotwinverse.ai` diarahkan ke `/sumut` via `frontend/middleware.ts`.

## Asal

Diekstrak dari `dtugm/hgu-geoait` (hanya scope UGM + dependensi shared-nya).
Web HGU/internal (dashboard, map_view, attendance, dsb.) tetap di repo asal.
