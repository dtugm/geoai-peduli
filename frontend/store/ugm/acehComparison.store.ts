import { create } from "zustand";

interface ChangeDetectionState {
  tutupanKiri: string[] | null;
  tutupanKanan: string[] | null;

  basemapKiri: string | null;
  basemapKanan: string | null;

  setTutupanKiri: (url: string | null) => void;
  setTutupanKanan: (url: string | null) => void;

  setBasemapKiri: (url: string | null) => void;
  setBasemapKanan: (url: string | null) => void;

  resetTutupan: () => void;
}

export const useAcehComparison = create<ChangeDetectionState>((set) => ({
  tutupanKiri: [
    "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/before_aceh_aoi1.pmtiles",
    "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/before_aceh_aoi2.pmtiles",
    "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/before_aceh_aoi3.pmtiles",
  ],
  tutupanKanan: [
    "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/after_aceh_aoi1.pmtiles",
    "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/after_aceh_aoi2.pmtiles",
    "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/after_aceh_aoi3.pmtiles",
  ],

  basemapKiri:
    "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/assets/ugmPeduli/raster/Aceh_before_banjir/{z}/{x}/{y}.png",
  basemapKanan:
    "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/assets/ugmPeduli/raster/Aceh_after_banjir/{z}/{x}/{y}.png",

  setTutupanKiri: (url) => set({ tutupanKiri: [] }),
  setTutupanKanan: (url) => set({ tutupanKanan: [] }),

  setBasemapKiri: (year) => set({ basemapKiri: year }),
  setBasemapKanan: (year) => set({ basemapKanan: year }),

  resetTutupan: () => set({ tutupanKiri: null, tutupanKanan: null }),
}));
