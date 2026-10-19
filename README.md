# GeoAI Peduli

Memahami dampak bencana melalui data geospasial. GeoAI Peduli memanfaatkan citra
satelit dan kecerdasan buatan untuk mengidentifikasi serta memetakan dampak bencana.

```
geoai-peduli/
├── frontend/   # Next.js 15 (App Router) — landing page, katalog, dashboard
└── backend/    # TODO — placeholder, belum dibutuhkan
```

## Cara menjalankan

Prasyarat: **Node.js 20+** (diuji dengan Node 22) dan npm.

```bash
cd frontend
npm install
npm run dev
```

Buka <http://localhost:3000>.

Build production:

```bash
cd frontend
npm run build
npm run start
```

Tidak ada variabel lingkungan yang wajib untuk dashboard bencana — semua sumber data
terbuka dan tanpa kunci API. `frontend/.env.example` hanya dipakai rute lama UGM.

## Halaman

| Rute | Isi |
|---|---|
| `/` | Landing page + katalog analisis |
| `/katalog/[slug]` | Ringkasan tiap analisis (`banjir-aceh-2025`, `perubahan-lahan-sumatra`, `kebakaran-hutan-asap-indonesia`) |
| `/banjir` | Banjir Aceh, Sumatera Utara, Sumatera Barat 2025 |
| `/tutupan-lahan` | Perubahan tutupan lahan Aceh, Sumut, Sumbar dengan bandingkan epoch |
| `/kebakaran` | Titik api, citra satelit, dan paparan asap se-Asia Tenggara |
| `/aceh`, `/sumut`, … | Viewer lama UGM (tetap tersedia) |

Menambah analisis baru: tambahkan entri di `frontend/constant/catalog.constant.ts`;
landing page dan halaman katalog dibangun otomatis dari daftar itu.

## Sumber data

Semua data diambil langsung saat peta dibuka — tidak ada database.

| Dashboard | Sumber |
|---|---|
| Kebakaran | NASA FIRMS VIIRS (via `/api/firms`), NASA GIBS (true color, Himawari, AOD, UVAI, CO), CAMS + angin 925 hPa via Open-Meteo |
| Banjir | Sentinel-1 RTC & Sentinel-2 (Microsoft Planetary Computer), Copernicus DEM, JRC Global Surface Water, ESA WorldCover, WorldPop |
| Tutupan lahan | PMTiles GeoAIT di S3, Sentinel-2 cloudless (EOX) |
| Batas wilayah | geoBoundaries |

File statis di `frontend/public/data` (batas wilayah, titik sampel kab/kota, statistik
banjir yang sudah dihitung) dan `frontend/public/images` (header & thumbnail lapisan).

## Catatan

- **CORS PMTiles** — bucket `pmtiles-collection` saat ini hanya mengizinkan
  `http://localhost:3000`. Tambahkan domain production di pengaturan CORS bucket S3
  sebelum deploy, kalau tidak peta tutupan lahan kosong.
- **Kuota Open-Meteo** — data asap diambil dari browser pengunjung (± 560 titik per
  muat, cache 3 jam). Jika kuota habis, otomatis beralih ke `/api/smoke`.
- Jalankan dev server di port **3000** agar sesuai dengan aturan CORS di atas.

## Deploy

Vercel / Cloud Run: Root Directory = `frontend`.

## Asal

Diekstrak dari `dtugm/hgu-geoait` (hanya scope UGM + dependensi shared-nya).
