// Katalog isu yang dipantau GeoAI Peduli.
// Setiap tema punya satu dashboard; menambah tema baru cukup dengan menambah entri
// di `catalog` — landing page dan halaman /katalog/[slug] dibangun otomatis.

export type CatalogStatus = "live" | "development";

export type CatalogCategory = "Banjir" | "Kebakaran & Asap" | "Hutan & Lahan";

export type CatalogIcon = "flood" | "landcover" | "fire";

export interface CatalogAnalysis {
  title: string;
  description: string;
  /** Nama sumber data (harus cocok dengan `dataSources[].name`) */
  sources: string[];
  /** "planned" = belum ada di dashboard; default dianggap sudah tersedia */
  status?: "planned";
}

export interface CatalogDataSource {
  name: string;
  provider: string;
  description: string;
  resolution: string;
  temporal: string;
  access: string;
  url: string;
}

export interface CatalogItem {
  slug: string;
  title: string;
  category: CatalogCategory;
  icon: CatalogIcon;
  status: CatalogStatus;
  region: string;
  period: string;
  /** Citra satelit kejadian (public/images/hazards) untuk sampul & header */
  image: string;
  imageCaption: string;
  /** Satu kalimat untuk kartu katalog */
  summary: string;
  /** Dua paragraf pendek: apa yang terjadi & bagaimana kami membantu */
  story: [string, string];
  dashboard: { href: string; label: string; highlights: string[] };
  tags: string[];
  analyses: CatalogAnalysis[];
  dataSources: CatalogDataSource[];
}

export const statusLabel: Record<CatalogStatus, string> = {
  live: "Aktif dipantau",
  development: "Segera hadir",
};

const sentinel2Cloudless: CatalogDataSource = {
  name: "Sentinel-2 Cloudless",
  provider: "EOX / Copernicus",
  description:
    "Mosaik tahunan citra Sentinel-2 bebas awan, dipakai sebagai citra dasar setiap epoch.",
  resolution: "10 m",
  temporal: "Tahunan (2021–2024)",
  access: "Terbuka (WMTS)",
  url: "https://s2maps.eu",
};

const geoaiLandCover: CatalogDataSource = {
  name: "Klasifikasi Tutupan Lahan GeoAI",
  provider: "GeoAIT – UGM",
  description:
    "Hasil klasifikasi tutupan lahan berbasis deep learning: Vegetasi Tinggi, Vegetasi Rendah, Sawit, Perkebunan Lain, Emplacement, Badan Air, dan Tanah Terbuka.",
  resolution: "Vektor (PMTiles)",
  temporal: "Per epoch",
  access: "Publik (viewer)",
  url: "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com",
};

export const catalog: CatalogItem[] = [
  {
    slug: "banjir-aceh-2025",
    title: "Banjir Sumatra 2025",
    category: "Banjir",
    icon: "flood",
    status: "live",
    region: "Aceh, Sumatera Utara & Sumatera Barat",
    period: "26 Nov – 6 Des 2025",
    image: "/images/hazards/banjir.jpg",
    imageCaption: "Lumpur banjir menutup pesisir Aceh Utara — Sentinel-2, akhir November 2025",
    summary:
      "Hujan ekstrem merendam puluhan ribu hektare di tiga provinsi. Kami memetakan genangan dan warga yang terdampak dari satelit.",
    story: [
      "Akhir November 2025, hujan ekstrem memicu banjir besar di Aceh, Sumatera Utara, dan Sumatera Barat. Sawah, permukiman, dan jalan terendam; banyak wilayah sulit dijangkau karena akses terputus dan langit terus tertutup awan.",
      "Radar satelit menembus awan dan hujan. Kami membandingkan kondisi musim kering dengan saat banjir untuk menemukan area yang tergenang, lalu menghitung kabupaten, penduduk, dan lahan yang terdampak — agar bantuan bisa diarahkan ke tempat yang paling membutuhkan.",
    ],
    dashboard: {
      href: "/banjir",
      label: "Dashboard Banjir Sumatra",
      highlights: [
        "Peta genangan radar Sentinel-1",
        "Kabupaten & penduduk terdampak",
        "Sawah & lahan yang tergenang",
        "Bandingkan sebelum ↔ saat banjir",
      ],
    },
    tags: ["Banjir", "Radar Sentinel-1", "Penduduk terdampak", "Sebelum–sesudah"],
    analyses: [
      {
        title: "Peta genangan",
        description: "Area yang tergenang terdeteksi dari perubahan sinyal radar musim kering ke saat banjir.",
        sources: ["Sentinel-1 RTC", "Copernicus DEM", "JRC Global Surface Water"],
      },
      {
        title: "Wilayah & warga terdampak",
        description: "Luas genangan per kabupaten dan perkiraan penduduk yang tinggal di area tergenang.",
        sources: ["WorldPop", "geoBoundaries"],
      },
      {
        title: "Lahan terdampak",
        description: "Sawah, permukiman, dan jenis lahan lain yang ikut terendam.",
        sources: ["ESA WorldCover"],
      },
      {
        title: "Sebelum ↔ saat banjir",
        description: "Geser untuk membandingkan citra radar dan optik musim kering dengan saat banjir.",
        sources: ["Sentinel-1 RTC", "Sentinel-2 L2A"],
      },
      {
        title: "Genangan di permukiman",
        description: "Analisis koherensi interferometri untuk banjir di antara bangunan dan di bawah pepohonan.",
        sources: ["Sentinel-1 SLC"],
        status: "planned",
      },
    ],
    dataSources: [
      {
        name: "Sentinel-1 RTC",
        provider: "Copernicus/ESA · Microsoft Planetary Computer",
        description:
          "Backscatter radar C-band Sentinel-1A/1C yang sudah dikoreksi radiometrik terhadap terrain. Menembus awan — cocok untuk memantau banjir saat hujan.",
        resolution: "10 m",
        temporal: "± 6 hari (1A + 1C)",
        access: "Terbuka (STAC & tile API Planetary Computer)",
        url: "https://planetarycomputer.microsoft.com/dataset/sentinel-1-rtc",
      },
      {
        name: "Sentinel-2 L2A",
        provider: "Copernicus/ESA · Microsoft Planetary Computer",
        description: "Citra optik multispektral untuk pembanding visual kondisi kering dan saat banjir.",
        resolution: "10 m",
        temporal: "± 5 hari",
        access: "Terbuka",
        url: "https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a",
      },
      {
        name: "WorldPop",
        provider: "University of Southampton",
        description: "Grid jumlah penduduk 2020 (constrained) untuk estimasi penduduk di area genangan.",
        resolution: "100 m",
        temporal: "2020",
        access: "Terbuka (CC BY 4.0)",
        url: "https://www.worldpop.org",
      },
      {
        name: "ESA WorldCover",
        provider: "ESA",
        description: "Peta tutupan lahan global 2021 untuk jenis lahan yang tergenang (sawah, permukiman, dll.).",
        resolution: "10 m",
        temporal: "2021",
        access: "Terbuka (CC BY 4.0)",
        url: "https://esa-worldcover.org",
      },
      {
        name: "geoBoundaries",
        provider: "William & Mary geoLab",
        description: "Batas kabupaten/kota (ADM2) untuk agregasi statistik.",
        resolution: "Vektor",
        temporal: "2020",
        access: "Terbuka (CC BY 3.0 IGO)",
        url: "https://www.geoboundaries.org",
      },
      {
        name: "Copernicus DEM",
        provider: "ESA / Airbus",
        description: "Model elevasi digital global untuk memasker laut dan dataran tinggi.",
        resolution: "30 m",
        temporal: "Statis",
        access: "Terbuka",
        url: "https://planetarycomputer.microsoft.com/dataset/cop-dem-glo-30",
      },
      {
        name: "JRC Global Surface Water",
        provider: "European Commission JRC",
        description:
          "Frekuensi keberadaan air 1984–2020 dari Landsat — untuk memisahkan sungai/danau permanen dari genangan banjir.",
        resolution: "30 m",
        temporal: "Statis (1984–2020)",
        access: "Terbuka",
        url: "https://global-surface-water.appspot.com",
      },
      {
        name: "Sentinel-1 SLC",
        provider: "Copernicus/ESA",
        description:
          "Data kompleks (fase + amplitudo) untuk analisis interferometri/koherensi — direncanakan, butuh pemrosesan backend.",
        resolution: "± 5 × 20 m",
        temporal: "± 6 hari",
        access: "Terbuka (Copernicus Data Space, ASF)",
        url: "https://dataspace.copernicus.eu",
      },
    ],
  },
  {
    slug: "perubahan-lahan-sumatra",
    title: "Hutan & Tutupan Lahan Sumatra",
    category: "Hutan & Lahan",
    icon: "landcover",
    status: "live",
    region: "Aceh, Sumatera Utara & Sumatera Barat",
    period: "2021 – 2025",
    image: "/images/hazards/deforestasi.jpg",
    imageCaption: "Kanal & petak kebun menggantikan hutan rawa di pesisir barat Aceh — Sentinel-2, 2025",
    summary:
      "Hutan Sumatra terus berganti menjadi kebun dan permukiman. Kami memetakan perubahannya dari tahun ke tahun.",
    story: [
      "Hutan Sumatra menyimpan air, menahan longsor, dan menjadi rumah satwa langka. Dari tahun ke tahun, sebagian hutan berganti menjadi kebun sawit, perkebunan lain, dan permukiman — perubahan yang ikut memperbesar risiko banjir dan kebakaran.",
      "Dengan model GeoAI, kami memetakan tutupan lahan dari citra satelit setiap tahun, lalu membandingkannya untuk melihat di mana hutan berkurang dan kebun bertambah — dasar untuk pengawasan dan pemulihan.",
    ],
    dashboard: {
      href: "/tutupan-lahan",
      label: "Dashboard Tutupan Lahan Sumatra",
      highlights: [
        "Peta tutupan lahan tiga provinsi",
        "Tren hutan & sawit 2021–2025",
        "Bandingkan dua tahun (geser)",
        "Komposisi lahan per provinsi",
      ],
    },
    tags: ["Hutan", "Sawit", "Multi-tahun", "GeoAI"],
    analyses: [
      {
        title: "Peta tutupan lahan",
        description: "Hutan, sawit, perkebunan, lahan terbangun, dan lahan terbuka dipetakan model GeoAI.",
        sources: [sentinel2Cloudless.name, geoaiLandCover.name],
      },
      {
        title: "Tren hutan & sawit",
        description: "Perubahan luas tiap kelas lahan dari 2021 hingga 2025.",
        sources: [geoaiLandCover.name],
      },
      {
        title: "Bandingkan antar-tahun",
        description: "Geser untuk melihat lokasi perubahan antara dua tahun pilihan.",
        sources: [sentinel2Cloudless.name, geoaiLandCover.name],
      },
      {
        title: "Peringatan kehilangan hutan",
        description: "Deteksi otomatis area hutan yang hilang setiap tahun untuk ketiga provinsi.",
        sources: [geoaiLandCover.name],
        status: "planned",
      },
    ],
    dataSources: [sentinel2Cloudless, geoaiLandCover],
  },
  {
    slug: "kebakaran-hutan-asap-indonesia",
    title: "Kebakaran Hutan & Asap",
    category: "Kebakaran & Asap",
    icon: "fire",
    status: "live",
    region: "Seluruh Indonesia",
    period: "Hampir seketika",
    image: "/images/hazards/kebakaran.jpg",
    imageCaption: "Gumpalan asap di atas Laut Jawa dan Kalimantan — VIIRS NOAA-20, Oktober 2026",
    summary:
      "Kebakaran hutan dan lahan menyelimuti langit dengan asap. Kami memantau titik api dan ke mana asap bergerak.",
    story: [
      "Setiap musim kemarau, kebakaran hutan dan lahan — terutama di lahan gambut — menghasilkan asap yang mengganggu kesehatan jutaan orang, menutup sekolah dan bandara, hingga terbawa ke negara tetangga.",
      "Kami menggabungkan titik api dari satelit NASA, citra Himawari tiap 10 menit, dan model sebaran asap per jam untuk melihat di mana api menyala dan ke mana asap bergerak hari ini — agar peringatan dan penanganan bisa lebih cepat.",
    ],
    dashboard: {
      href: "/kebakaran",
      label: "Dashboard Kebakaran & Asap",
      highlights: [
        "Titik api terkini per provinsi",
        "Wilayah terpapar asap per jam",
        "Prakiraan asap 3 hari ke depan",
        "Citra satelit & aerosol harian",
      ],
    },
    tags: ["Titik api", "Asap", "Prakiraan", "Seluruh Indonesia"],
    analyses: [
      {
        title: "Titik api terkini",
        description: "Titik panas satelit 24 jam hingga 7 hari terakhir, dirangkum per provinsi.",
        sources: ["NASA FIRMS"],
      },
      {
        title: "Pergerakan asap",
        description: "Konsentrasi asap per jam dan arah angin, lengkap dengan prakiraan 3 hari.",
        sources: ["CAMS", "Open-Meteo"],
      },
      {
        title: "Citra & aerosol satelit",
        description: "Citra harian, Himawari tiap 10 menit, ketebalan aerosol, dan karbon monoksida.",
        sources: ["NASA GIBS", "Himawari-9 AHI", "MODIS MAIAC & VIIRS AOD"],
      },
      {
        title: "Warga terpapar asap",
        description: "Perkiraan jumlah penduduk yang menghirup udara tidak sehat per kabupaten.",
        sources: ["CAMS", "WorldPop", "OpenAQ & ISPU"],
        status: "planned",
      },
      {
        title: "Area terbakar & gambut",
        description: "Pemetaan bekas terbakar dan kebakaran di lahan gambut.",
        sources: ["Sentinel-2 L2A", "MODIS Burned Area (MCD64A1)", "Peta Gambut Indonesia"],
        status: "planned",
      },
    ],
    dataSources: [
      {
        name: "NASA FIRMS",
        provider: "NASA LANCE",
        description:
          "Titik api aktif dari sensor VIIRS (S-NPP, NOAA-20, NOAA-21) dan MODIS (Terra/Aqua), lengkap dengan tingkat kepercayaan dan Fire Radiative Power (FRP).",
        resolution: "375 m (VIIRS), 1 km (MODIS)",
        temporal: "Near real-time (< 3 jam), arsip sejak 2000",
        access: "Terbuka, API dengan MAP_KEY gratis",
        url: "https://firms.modaps.eosdis.nasa.gov",
      },
      {
        name: "NASA GIBS",
        provider: "NASA EOSDIS",
        description:
          "Layanan tile citra siap pakai: true color VIIRS, Himawari-9, AOD MAIAC, aerosol index OMPS, dan CO AIRS — dipakai langsung di peta.",
        resolution: "250 m – 2 km (tergantung layer)",
        temporal: "10 menit (Himawari) hingga harian",
        access: "Terbuka, tanpa kunci (WMTS)",
        url: "https://nasa-gibs.github.io/gibs-api-docs/",
      },
      {
        name: "Himawari-9 AHI",
        provider: "JMA / JAXA P-Tree",
        description:
          "Satelit geostasioner yang memotret Indonesia setiap 10 menit — ideal untuk melihat pergerakan plume asap dan kebakaran sepanjang hari.",
        resolution: "0,5–2 km",
        temporal: "Setiap 10 menit",
        access: "Terbuka (via NASA GIBS; data penuh via JAXA P-Tree)",
        url: "https://www.eorc.jaxa.jp/ptree/",
      },
      {
        name: "Sentinel-5P TROPOMI",
        provider: "ESA / Copernicus",
        description:
          "UV Aerosol Index (asap yang menyerap cahaya) dan kolom total karbon monoksida (CO) — penanda kuat pembakaran biomassa.",
        resolution: "± 5,5 × 3,5 km",
        temporal: "Harian",
        access: "Terbuka (Copernicus Data Space, Google Earth Engine)",
        url: "https://dataspace.copernicus.eu",
      },
      {
        name: "MODIS MAIAC & VIIRS AOD",
        provider: "NASA",
        description:
          "Aerosol Optical Depth (MCD19A2 MAIAC dan VIIRS Deep Blue) — ukuran ketebalan aerosol di kolom atmosfer, dasar estimasi PM2.5.",
        resolution: "1 km (MAIAC), 6 km (VIIRS)",
        temporal: "Harian",
        access: "Terbuka (NASA Earthdata, GIBS, Earth Engine)",
        url: "https://www.earthdata.nasa.gov",
      },
      {
        name: "CAMS",
        provider: "ECMWF / Copernicus",
        description:
          "Copernicus Atmosphere Monitoring Service: prakiraan PM2.5, PM10, dan AOD hingga 5 hari, serta emisi kebakaran harian (GFAS).",
        resolution: "± 40 km (global), 0,1° (GFAS)",
        temporal: "2× sehari (prakiraan), harian (GFAS)",
        access: "Terbuka (Atmosphere Data Store)",
        url: "https://ads.atmosphere.copernicus.eu",
      },
      {
        name: "Open-Meteo",
        provider: "Open-Meteo.com",
        description:
          "API terbuka yang menyajikan model CAMS (PM2.5, AOD, CO) dan angin per jam dalam bentuk grid — dipakai untuk animasi dan prakiraan sebaran asap.",
        resolution: "Grid 1° (asap), 2° (angin)",
        temporal: "Per jam, 24 jam lalu + 3 hari prakiraan",
        access: "Terbuka untuk non-komersial (CC BY 4.0)",
        url: "https://open-meteo.com",
      },
      {
        name: "ERA5",
        provider: "ECMWF / Copernicus",
        description:
          "Reanalisis cuaca (angin, kelembapan, suhu) untuk lintasan asap dan perhitungan Fire Weather Index.",
        resolution: "0,25°",
        temporal: "Per jam",
        access: "Terbuka (Climate Data Store)",
        url: "https://cds.climate.copernicus.eu",
      },
      {
        name: "OpenAQ & ISPU",
        provider: "OpenAQ / KLHK",
        description:
          "Pengukuran PM2.5 stasiun darat untuk kalibrasi dan validasi estimasi PM2.5 dari satelit.",
        resolution: "Titik stasiun",
        temporal: "Per jam",
        access: "Terbuka (API OpenAQ), ISPU via portal KLHK",
        url: "https://openaq.org",
      },
      {
        name: "Sentinel-2 L2A",
        provider: "ESA / Copernicus",
        description:
          "Citra multispektral untuk menghitung Normalized Burn Ratio (NBR/dNBR) sebelum dan sesudah kebakaran.",
        resolution: "10–20 m",
        temporal: "± 5 hari",
        access: "Terbuka (Copernicus Data Space)",
        url: "https://dataspace.copernicus.eu",
      },
      {
        name: "MODIS Burned Area (MCD64A1)",
        provider: "NASA",
        description:
          "Produk area terbakar bulanan global, berguna untuk analisis historis dan validasi.",
        resolution: "500 m",
        temporal: "Bulanan, sejak 2000",
        access: "Terbuka (NASA Earthdata, Earth Engine)",
        url: "https://lpdaac.usgs.gov/products/mcd64a1v061/",
      },
      {
        name: "geoBoundaries",
        provider: "William & Mary geoLab",
        description:
          "Batas administrasi provinsi (ADM1) untuk agregasi hotspot per provinsi.",
        resolution: "Vektor (disederhanakan)",
        temporal: "Statis",
        access: "Terbuka (ODbL 1.0)",
        url: "https://www.geoboundaries.org",
      },
      {
        name: "Peta Gambut Indonesia",
        provider: "BBSDLP Kementan / KLHK",
        description:
          "Sebaran lahan gambut — kebakaran di gambut menghasilkan asap paling pekat dan sulit dipadamkan.",
        resolution: "Skala 1:250.000",
        temporal: "Statis",
        access: "Terbuka terbatas (portal pemerintah)",
        url: "https://sipongi.menlhk.go.id",
      },
      {
        name: "WorldPop",
        provider: "University of Southampton",
        description:
          "Grid kepadatan penduduk untuk menghitung jumlah orang yang terpapar asap.",
        resolution: "100 m",
        temporal: "Tahunan",
        access: "Terbuka (CC BY 4.0)",
        url: "https://www.worldpop.org",
      },
      {
        name: "CHIRPS",
        provider: "UCSB Climate Hazards Center",
        description:
          "Estimasi curah hujan harian untuk memantau kekeringan yang memicu kebakaran.",
        resolution: "± 5 km",
        temporal: "Harian",
        access: "Terbuka",
        url: "https://www.chc.ucsb.edu/data/chirps",
      },
    ],
  },
];

export const getCatalogItem = (slug: string) =>
  catalog.find((item) => item.slug === slug);
