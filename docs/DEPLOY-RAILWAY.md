# Deploy ke Railway

Rencana dan langkah deploy GeoAI Peduli ke [Railway](https://railway.com).

Disusun: **19 Oktober 2026**, berdasarkan dokumentasi Railway per tanggal itu.

## Ringkasan

| | |
|---|---|
| Service | Satu service `web`: Next.js 15 di `frontend/`. Tidak ada database, volume, atau backend |
| Builder | Railpack (default Railway), Node 22 dari `engines.node` di `frontend/package.json` |
| Build / start | `npm run build` / `npm run start` (`next start` membaca `PORT` dari Railway, bind ke `0.0.0.0`) |
| Healthcheck | `GET /api/health` → `{"status":"ok"}` |
| Region | Southeast Asia (Singapura), `asia-southeast1-eqsg3a`, 1 replika |
| Deploy otomatis | Setiap push ke `main` yang mengubah file di `frontend/**` |
| Konfigurasi | [`.railway/railway.ts`](../.railway/railway.ts) (Infrastructure as Code) |

### Kenapa `.railway/railway.ts`, bukan `railway.json`

Railway sudah men-deprecate Config as Code (`railway.json` / `railway.toml`). Service baru
tidak bisa memakainya, dan file yang ada berhenti dibaca pada **1 Desember 2026**.
Penggantinya adalah Infrastructure as Code (IaC): satu file TypeScript yang diterapkan
lewat Railway CLI dengan `railway config plan` dan `railway config apply`.

**Jangan menambah `railway.json`.** CLI menolak service yang dikelola oleh keduanya.

Perbedaan yang perlu diingat: Railway **tidak** membaca `.railway/railway.ts` saat deploy.
Push ke `main` hanya men-deploy kode. Mengubah pengaturan service (perintah build, region,
variabel, domain) harus lewat `railway config apply`.

## Yang sudah disiapkan di repo

| File | Fungsi |
|---|---|
| [`.railway/railway.ts`](../.railway/railway.ts) | Definisi project `geoai-peduli` dan service `web` |
| [`package.json`](../package.json) (root) | Hanya berisi SDK `railway`, supaya CLI bisa mengevaluasi `railway.ts` |
| [`frontend/app/api/health/route.ts`](../frontend/app/api/health/route.ts) | Endpoint healthcheck. Tidak memanggil sumber eksternal |
| `engines.node` di [`frontend/package.json`](../frontend/package.json) | Mengunci Node 22. Tanpa ini Railpack memakai Node LTS terbaru, yang belum diuji |
| `outputFileTracingRoot` di [`frontend/next.config.js`](../frontend/next.config.js) | Mengunci root Next.js ke `frontend/`, karena root repo sekarang punya `package.json` sendiri |

Sudah diuji lokal (19 Okt 2026): `npm run build` sukses, `PORT=3456 npm run start` mendengarkan
di port itu, `/api/health` menjawab 200, dan `/`, `/banjir`, `/tutupan-lahan`, `/kebakaran`,
`/katalog/banjir-aceh-2025`, `/sumut` menjawab 200. `.railway/railway.ts` lolos typecheck
dan menghasilkan service yang diharapkan. `railway config plan` belum dijalankan karena
butuh login Railway.

## Prasyarat

- **Workspace Railway** dengan billing aktif, untuk tim.
- **Railway GitHub App** terpasang di org `dtugm` dengan akses ke repo `geoai-peduli`.
  Pemasangan di org butuh persetujuan owner org.
- **Railway CLI 5.42.1 atau lebih baru.** Cek dengan `railway --version`. Cara pasang:
  `npm i -g @railway/cli`, atau `scoop install railway` di Windows.
- **Node 22+ dan npm**, untuk `npm install` di root repo.
- **Akses AWS ke bucket `pmtiles-collection`**, minimal `s3:GetBucketCORS` dan
  `s3:PutBucketCORS`.
- **Perubahan ini sudah di-merge ke `main`.** Railway membangun dari GitHub, bukan dari
  folder lokal. Kalau `/api/health` belum ada di `main`, healthcheck deploy pertama gagal.

## Deploy pertama

Jalankan dari root repo.

**1. Login dan buat project.** Project otomatis ter-link ke folder ini, dengan environment
`production`.

```bash
railway login
```

```bash
railway init --name geoai-peduli
```

Kalau project sudah dibuat lewat dashboard, pakai `railway link`.

**2. Pasang SDK IaC.**

```bash
npm install
```

**3. Lihat rencana perubahan.** Hasilnya harus hanya `+ Create service web`.

```bash
railway config plan --show-values
```

**4. Terapkan.** Railway membuat service, lalu langsung membangun commit terbaru di `main`.

```bash
railway config apply
```

**5. Pantau build sampai healthcheck lolos.** Bisa lewat dashboard, atau:

```bash
railway logs --build --latest
```

**6. Buat domain publik.** Service Railway tidak publik secara default.

```bash
railway domain --service web
```

Hasilnya `https://<nama>.up.railway.app`. Catat, karena dipakai di langkah berikutnya.

**7. Tambahkan domain itu ke CORS bucket PMTiles.** Lihat bagian berikut. Sebelum langkah
ini selesai, peta `/tutupan-lahan`, `/aceh`, `/acehDampak`, `/sumut`, dan `/sumbar` akan kosong.

**8. Jalankan [checklist verifikasi](#checklist-verifikasi).**

## CORS bucket `pmtiles-collection`

File PMTiles dibaca langsung dari browser dengan HTTP range request ke S3, jadi origin
website harus terdaftar di aturan CORS bucket. Saat ini hanya `http://localhost:3000` yang
terdaftar (lihat [DATA.md](DATA.md#1-s3-pmtiles-collection)). Bucket `digital-twin-ugm`
sudah `*`, jadi tidak perlu diubah.

`put-bucket-cors` menimpa seluruh aturan. Simpan aturan yang berlaku dulu:

```bash
aws s3api get-bucket-cors --bucket pmtiles-collection --region ap-southeast-1 > cors-lama.json
```

Buat `cors-baru.json`. Contoh di bawah mengikuti rekomendasi PMTiles untuk S3; ganti
domainnya, dan pertahankan header lain yang sudah ada di `cors-lama.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:3000",
        "https://<nama>.up.railway.app"
      ],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["range", "if-match"],
      "ExposeHeaders": ["etag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Terapkan:

```bash
aws s3api put-bucket-cors --bucket pmtiles-collection --region ap-southeast-1 --cors-configuration file://cors-baru.json
```

Cek dari terminal. Hasilnya harus `206 Partial Content` dengan header
`access-control-allow-origin` berisi domain Railway:

```bash
curl -s -o /dev/null -D - -H "Origin: https://<nama>.up.railway.app" -H "Range: bytes=0-16383" https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2025.pmtiles
```

## Domain kustom (opsional)

Contohnya `ugmpeduli.geotwinverse.ai`, yang disebut di
[`frontend/middleware.ts`](../frontend/middleware.ts).

1. Tambahkan domain di service `web` dalam `.railway/railway.ts`:

   ```ts
   domains: ["ugmpeduli.geotwinverse.ai"],
   ```

   Lalu jalankan `railway config plan` dan `railway config apply`. Domain sebaiknya
   ditambah lewat file ini, bukan lewat dashboard atau `railway domain <domain>`, supaya
   tidak terhapus oleh `apply` berikutnya.
2. Lihat record DNS yang dibutuhkan (CNAME dan TXT verifikasi), lalu pasang di pengelola
   DNS `geotwinverse.ai`:

   ```bash
   railway domain status ugmpeduli.geotwinverse.ai --service web
   ```

3. Tambahkan `https://ugmpeduli.geotwinverse.ai` ke CORS bucket.
4. Kalau domain itu sedang mengarah ke deployment lain, pindahkan DNS-nya hanya setelah
   versi Railway lolos checklist di bawah.

## Checklist verifikasi

| Cek | Cara | Yang diharapkan |
|---|---|---|
| Healthcheck | `curl https://<domain>/api/health` | `{"status":"ok"}` |
| Landing & katalog | Buka `/` dan satu halaman `/katalog/...` | Halaman dan thumbnail tampil |
| FIRMS | `curl "https://<domain>/api/firms?range=24h"` | JSON berisi `rows`. Panggilan pertama setelah deploy bisa puluhan detik |
| Asap | `curl https://<domain>/api/smoke` | JSON berisi `times` |
| Tutupan lahan | Buka `/tutupan-lahan`, lalu cek tab Network di DevTools | Request `.pmtiles` berstatus 206, tanpa error CORS di Console |
| Banjir | Buka `/banjir` | Peta dan statistik tampil |
| Kebakaran | Buka `/kebakaran` | Titik api dan lapisan asap tampil |
| Viewer lama | Buka `/sumut` dan `/acehDampak` | Peta tampil |

## Operasional

- **Deploy kode:** merge ke `main`. Railway hanya membangun ulang kalau ada file di
  `frontend/**` yang berubah. Perubahan di `docs/` atau `.railway/` tidak memicu deploy.
- **Ubah konfigurasi service:** edit `.railway/railway.ts`, jalankan `railway config plan`,
  lalu `railway config apply`. Commit file-nya supaya repo tetap jadi sumber kebenaran.
- **Hati-hati mengedit lewat dashboard.** `apply` menyamakan Railway dengan isi file.
  Variabel atau domain yang hanya ditambah di dashboard bisa terhapus pada `apply` berikutnya.
  Selalu baca perubahan yang ditandai destruktif di output `plan`. Untuk secret yang tidak
  boleh masuk repo, tulis nilainya sebagai `preserve()`.
- **Rollback:** di dashboard, buka service `web` → Deployments → titik tiga di deployment
  sebelumnya → Rollback. Image dan variabel ikut dikembalikan.
- **Log:** `railway logs` untuk runtime, `railway logs --build` untuk build.
- **Variabel lingkungan:** tidak ada yang wajib. `frontend/.env.example` peninggalan rute lama
  UGM dan tidak dibaca kode saat ini.

## Risiko dan catatan

- **Cache di memori, jadi cukup satu replika.** `/api/firms` (15 menit) dan `/api/smoke`
  (6 jam) menyimpan cache di proses Node. Cache hilang setiap deploy atau restart, jadi
  request pertama sesudahnya lebih lambat. Kalau replika ditambah, tiap replika mengunduh
  data sendiri.
- **Open-Meteo dipanggil dari IP Railway.** Fallback `/api/smoke` memanggil Open-Meteo dari
  server. IP keluar Railway dipakai bersama pengguna lain, jadi kuota per IP bisa lebih
  cepat habis daripada saat dijalankan lokal. Pantau error 502 di log.
- **Lockfile tidak di-commit.** `.gitignore` mengabaikan `package-lock.json`, jadi Railpack
  menjalankan `npm install` dan bisa mendapat versi dependensi yang berbeda dari lokal
  (mis. `next` ditulis `^15.5.9`). Disarankan meng-commit `frontend/package-lock.json`
  (hapus baris `package-lock.json` dari `.gitignore`), supaya build bisa direproduksi.

## Opsional: apply otomatis lewat GitHub Actions

Railway menyediakan action [`railwayapp/config`](https://github.com/railwayapp/config).
Action ini menjalankan `plan` di setiap PR yang mengubah `.railway/**` dan memasang diff-nya
sebagai komentar PR, lalu menjalankan `apply` saat PR di-merge. Syaratnya, buat project token
untuk environment `production` dan simpan sebagai secret repo `RAILWAY_TOKEN`. Workflow siap
pakai ada di [dokumentasi Railway](https://docs.railway.com/infrastructure-as-code#apply-from-github-actions).

Workflow ini belum dipasang di repo karena butuh secret tersebut lebih dulu.

## Referensi

- [Infrastructure as Code](https://docs.railway.com/infrastructure-as-code) dan
  [referensi DSL](https://docs.railway.com/infrastructure-as-code/reference)
- [Railpack: Node.js](https://railpack.com/languages/node)
- [Healthcheck](https://docs.railway.com/deployments/healthchecks)
- [Region](https://docs.railway.com/deployments/regions)
- [PMTiles di cloud storage](https://docs.protomaps.com/pmtiles/cloud-storage)
