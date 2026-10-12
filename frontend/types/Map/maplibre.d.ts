// src/types/global.d.ts
import { basemapStyles } from "@/constant/basemap.constant";
declare global {
  type BasemapKey = keyof typeof basemapStyles;
}
export {};
