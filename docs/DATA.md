# Peta Data GeoAI Peduli

Inventaris tempat data proyek ini disimpan dan bagian kode yang memakainya.

Terakhir diverifikasi: **19 Oktober 2026** (ukuran, tanggal upload, dan metadata PMTiles
dibaca langsung dari S3).

Ringkasnya, data ada di tiga tempat:

1. **S3 `pmtiles-collection`**: hasil klasifikasi tutupan lahan GeoAI (PMTiles vektor).
2. **S3 `digital-twin-ugm`**: raster citra Aceh sebelum/sesudah banjir, plus GeoJSON lama.
3. **Di repo**: `frontend/public/data/*.json` dan statistik luas yang ditulis langsung di TypeScript.

Tidak ada database. Kode tidak memakai SDK atau kredensial AWS: semua objek S3 diakses
lewat URL publik yang di-hardcode. Data lain (Sentinel-1/2, FIRMS, GIBS, Open-Meteo, EOX)
diambil langsung dari penyedianya, lihat bagian *Sumber data* di [README](../README.md).

> **Batasan inventaris ini.** Kedua bucket menolak listing publik (403), jadi tabel di
> bawah hanya berisi objek yang direferensikan kode. Bisa jadi ada objek lain di bucket.
> Lihat [Inventaris lengkap bucket](#inventaris-lengkap-bucket).

---

## 1. S3 `pmtiles-collection`

- Region: `ap-southeast-1`
- Base URL: `https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com`
- CORS: hanya `http://localhost:3000`, metode `GET`. Domain production harus ditambahkan
  sebelum deploy, kalau tidak peta tutupan lahan akan kosong.

### Skema (berlaku untuk semua file)

| Properti | Nilai |
|---|---|
| Format | PMTiles v3, tile vektor MVT |
| Zoom | 0–14 (`*_aoi3`: 1–14) |
| Generator | `tile-join` v2.80.0 (tippecanoe), dikonversi dari `.mbtiles` |
| Layer | Satu layer, namanya sama dengan nama file (mis. `sumut_2023`) |
| Geometri | Polygon |
| Field | `kelas` (String), `id` (Number), `area_ha` (Number), `feature_id` (Number) |

`sumut_2021` **tidak** punya field `feature_id`.

Nilai `id` dan `kelas` cocok dengan `LandCoverClass` di
[landcover.constant.ts](../frontend/constant/landcover.constant.ts):

| `id` | `kelas` |
|---|---|
| 1 | Vegetasi Tinggi |
| 2 | Vegetasi Rendah |
| 3 | Emplacement |
| 4 | Badan Air |
| 5 | Tanah Terbuka |
| 6 | Sawit |
| 9 | Perkebunan Lain |

### Tutupan lahan per provinsi per tahun

| File | Ukuran | Poligon | Bounds (lon/lat) | Upload |
|---|---|---|---|---|
| `aceh_2025.pmtiles` | 105 MB | 1.074.467 | 94,97–98,31 / 0,00–6,08 | 26 Jan 2026 |
| `sumut_2021.pmtiles` | 141 MB | 1.732.366 | 97,03–100,44 / −0,64–4,35 | 1 Feb 2026 |
| `sumut_2022.pmtiles` | 143 MB | 1.567.454 | 97,03–100,44 / −0,64–4,39 | 1 Feb 2026 |
| `sumut_2023.pmtiles` | 192 MB | 1.679.909 | 96,94–100,44 / −0,64–4,39 | 1 Feb 2026 |
| `sumut_2024.pmtiles` | 193 MB | 1.721.850 | 97,03–100,44 / −0,64–4,35 | 1 Feb 2026 |
| `sumut_2025.pmtiles` | 145 MB | 1.614.603 | 97,03–100,44 / −0,64–4,35 | 1 Feb 2026 |
| `sumbar_2025.pmtiles` | 57 MB | 725.363 | 99,76–101,91 / −2,48–0,44 | 1 Feb 2026 |

Tidak ada: `aceh_2021`–`aceh_2024` dan `sumbar_2021`–`sumbar_2024`. Ini sesuai dengan
`availability` di [landcover.ts](../frontend/lib/landcover/landcover.ts).

Dipakai oleh:

- `/tutupan-lahan`: lewat `pmtilesUrl()` di [landcover.ts](../frontend/lib/landcover/landcover.ts)
- `/aceh`: [AcehMap.tsx](../frontend/components/UGM/aceh/AcehMap.tsx)
- `/sumut`: `epochPbfTilesUrl` di [MapClass.ts](../frontend/components/UGM/sumut/MapClass.ts)
- `/sumutEpochAnalysis`: [sumutComparison.store.ts](../frontend/store/ugm/sumutComparison.store.ts)
- `/sumbar`: [SumbarMap.tsx](../frontend/components/UGM/sumbar/SumbarMap.tsx)

### Tutupan lahan sebelum/sesudah banjir Aceh (per AOI)

| File | Ukuran | Poligon | Bounds (lon/lat) |
|---|---|---|---|
| `before_aceh_aoi1.pmtiles` | 7,2 MB | 93.805 | 97,12–97,73 / 4,83–5,35 |
| `after_aceh_aoi1.pmtiles` | 3,8 MB | 44.854 | 97,12–97,73 / 4,83–5,27 |
| `before_aceh_aoi2.pmtiles` | 4,9 MB | 62.447 | 95,85–96,42 / 4,04–4,48 |
| `after_aceh_aoi2.pmtiles` | 5,0 MB | 64.018 | 95,85–96,42 / 4,04–4,48 |
| `before_aceh_aoi3.pmtiles` | 0,45 MB | 6.232 | 97,63–97,77 / 4,61–4,70 |
| `after_aceh_aoi3.pmtiles` | 0,35 MB | 4.276 | 97,63–97,78 / 4,61–4,70 |

Lokasi: aoi1 sekitar Lhokseumawe/Aceh Utara, aoi2 sekitar Meulaboh, aoi3 area kecil.
Semua diupload 1 Feb 2026.

Dipakai oleh `/acehDampak`, lewat
[acehComparison.store.ts](../frontend/store/ugm/acehComparison.store.ts): `before_*` di
peta kiri, `after_*` di peta kanan.

---

## 2. S3 `digital-twin-ugm`

- Region: `ap-southeast-1`
- Base URL: `https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com`
- CORS: `*` (semua origin)
- Dari namanya, bucket ini dipakai bersama proyek lain. Bagian milik proyek ini ada di
  prefix `assets/ugmPeduli/`.

| Path | Isi | Dipakai oleh |
|---|---|---|
| `assets/ugmPeduli/raster/Aceh_before_banjir/{z}/{x}/{y}.png` | Tile raster PNG 256 px, skema **TMS** (y terbalik), zoom 7–13 | `/acehDampak`, basemap kiri |
| `assets/ugmPeduli/raster/Aceh_after_banjir/{z}/{x}/{y}.png` | Sama | `/acehDampak`, basemap kanan |
| `assets/sumut/MUSIM_MAS_2019_2.geojson` | GeoJSON, 0,83 MB, upload 3 Des 2025 | Hanya `SumutMapView.deprecated.tsx` (tidak aktif) |
| `assets/sumut/MUSIM_MAS_2020_2.geojson` | GeoJSON, 0,76 MB, upload 3 Des 2025 | Sama |

Kedua GeoJSON `MUSIM_MAS_*` adalah warisan repo asal `hgu-geoait`. Di
[MapClass.ts](../frontend/components/UGM/sumut/MapClass.ts) (`epochGeojson`), tahun
2022–2025 menunjuk ke file `2020_2` yang sama.

---

## 3. Data di dalam repo

### `frontend/public/data/`

| File | Ukuran | Isi | Dipakai oleh |
|---|---|---|---|
| [banjir-sumatra-2025.json](../frontend/public/data/banjir-sumatra-2025.json) | 24 KB | Statistik banjir yang sudah dihitung: total, per provinsi, per kabupaten (luas genangan, penduduk terdampak). `generatedAt` 2026-10-17 | `/banjir` ([FloodView.tsx](../frontend/components/flood/FloodView.tsx)), tipe di [stats.types.ts](../frontend/lib/flood/stats.types.ts) |
| [asap-wilayah.json](../frontend/public/data/asap-wilayah.json) | 254 KB | Titik sampel per kab/kota untuk query asap Open-Meteo | `/kebakaran` ([FireView.tsx](../frontend/components/fire/FireView.tsx)) |
| [kabupaten-sumatra.json](../frontend/public/data/kabupaten-sumatra.json) | 189 KB | GeoJSON batas kab/kota Aceh, Sumut, Sumbar | `/banjir` |
| [indonesia-provinsi.json](../frontend/public/data/indonesia-provinsi.json) | 380 KB | GeoJSON batas provinsi Indonesia | `/banjir`, `/kebakaran`, `/tutupan-lahan`, `/api/firms` |

Skrip yang menghasilkan `banjir-sumatra-2025.json` dan `asap-wilayah.json` **tidak ada**
di repo.

### Statistik di kode

[sumut.constant.ts](../frontend/components/UGM/sumut/constant/sumut.constant.ts) menyimpan
luas (ha) per kelas per epoch, dihitung dari file `.shp`:

- `data_luasan_sumut`: 2021–2025
- `data_luasan_aceh`: 2025
- `data_luasan_sumbar`: 2025

Dipakai oleh grafik `/tutupan-lahan` lewat `lcStats` di
[landcover.ts](../frontend/lib/landcover/landcover.ts). Angka ini tidak otomatis ikut
berubah kalau file PMTiles di S3 diganti.

---

## Catatan dan utang teknis

- **URL S3 tersebar di 7 file.** Hanya [landcover.ts](../frontend/lib/landcover/landcover.ts)
  yang memakai konstanta `PMTILES_BASE`. Komponen UGM lama (`AcehMap`, `SumbarMap`,
  `MapClass`, `acehComparison.store`, `sumutComparison.store`) dan `catalog.constant.ts`
  menulis URL lengkap sendiri-sendiri. Kalau bucket dipindah, semua file itu harus diubah.
- **`AcehMap` dan `SumbarMap`** membentuk URL `aceh_${epoch}` / `sumbar_${epoch}` untuk
  semua tahun, padahal hanya 2025 yang ada. Tahun lain akan 403.
- **Kode mati:** [sumbar.constant.ts](../frontend/components/UGM/sumbar/sumbar.constant.ts)
  menunjuk ke server Railway `yzserver-production` yang sudah 404 dan tidak diimpor di
  mana pun.
- **Statistik luas ditulis manual di kode** (lihat bagian 3), jadi bisa tidak sinkron
  dengan PMTiles.

---

## Inventaris lengkap bucket

Listing publik ditolak, jadi untuk melihat semua objek perlu kredensial AWS yang punya
izin `s3:ListBucket`:

```bash
aws s3 ls s3://pmtiles-collection --recursive --human-readable --summarize
```

```bash
aws s3 ls s3://digital-twin-ugm/assets/
```

Untuk `digital-twin-ugm`, jangan pakai `--recursive` langsung di `assets/`, karena folder
raster berisi ribuan tile. Buka per prefix saja (mis. `assets/ugmPeduli/`).

Metadata satu file PMTiles (layer, field, bounds, zoom) bisa dibaca tanpa mengunduh seluruh
file, pakai CLI [go-pmtiles](https://github.com/protomaps/go-pmtiles/releases):

```bash
pmtiles show https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2025.pmtiles
```
