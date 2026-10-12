import { create } from "zustand";

interface sumutState {
  rasterOpacity: number;
  vectorOpacity: number;
  showRasterLayer: boolean;
  showVectorLayer: boolean;
  setRasterOpacity: (value: number) => void;
  setVectorOpacity: (value: number) => void;
  setShowRasterLayer: (value: boolean) => void;
  setShowVectorLayer: (value: boolean) => void;
}

export const useSumutStore = create<sumutState>((set) => ({
  rasterOpacity: 100,
  vectorOpacity: 90,
  showRasterLayer: true,
  showVectorLayer: true,
  setRasterOpacity: (value) => set({ rasterOpacity: value }),
  setVectorOpacity: (value) => set({ vectorOpacity: value }),
  setShowRasterLayer: (value) => set({ showRasterLayer: value }),
  setShowVectorLayer: (value) => set({ showVectorLayer: value }),
}));
