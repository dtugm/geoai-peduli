import { create } from "zustand";

interface HguInfo {
  id: string;
  kanwil: string;
  kantah: string;
  nomorHak: string;
  validSejak: string;
  validSampai: string | null;
  berakhirHak: string | null;
  statusBT: string;
  pemegangHak: string;
  nib: string;
  luasTertulis: number;
  luasPeta: number;
  penggunaan: string | null;
  tahunEpoch: number | null;
  namaHgu: string | null;
  skPemberian: string | null;
  skPerpanjangan: string | null;
  skPembaruan: string | null;
  luas: number | null;
  geojsonUrl: string;
  createdAt: string;
  updatedAt: string;
  company: any | null;
  geometry: any;
  organization: {
    id: string;
    name: string;
  };
}

interface ChangeDetectionState {
  hguKiri: GeoJSON.FeatureCollection | null;
  hguKanan: GeoJSON.FeatureCollection | null;
  hguInfo: HguInfo | null;
  namaHguKiri: string | null;
  namaHguKanan: string | null;

  setHguKiri: (data: GeoJSON.FeatureCollection | null) => void;
  setHguKanan: (data: GeoJSON.FeatureCollection | null) => void;
  setHguInfo: (data: HguInfo | null) => void;
  SetNamaHguKiri: (data: string | null) => void;
  SetNamaHguKanan: (data: string | null) => void;
}

export const useComparisonStore = create<ChangeDetectionState>((set) => ({
  hguKiri: null,
  hguKanan: null,
  hguInfo: null,
  namaHguKiri: null,
  namaHguKanan: null,

  setHguKiri: (data) => set({ hguKiri: data }),
  setHguKanan: (data) => set({ hguKanan: data }),
  setHguInfo: (data) => set({ hguInfo: data }),
  SetNamaHguKiri: (data) => set({ namaHguKiri: data }),
  SetNamaHguKanan: (data) => set({ namaHguKanan: data }),
}));
