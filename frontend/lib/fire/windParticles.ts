import type { Map as MapLibreMap } from "maplibre-gl";

import { SmokeGrid } from "./smoke.types";
import { gridBounds, sampleGrid } from "./smokeRender";

const PARTICLES = 1200;
const MAX_AGE = 90;
// Piksel layar per (m/s) per frame — konstan di semua zoom
const SPEED = 0.18;

interface Particle {
  lon: number;
  lat: number;
  age: number;
}

/**
 * Partikel angin ala earth.nullschool: titik-titik yang terbawa angin dengan
 * jejak memudar, digambar di canvas di atas peta. Memperlihatkan ke mana asap
 * akan terbawa.
 */
export class WindParticles {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private frame = 0;
  private grid: SmokeGrid | null = null;
  private u: number[] = [];
  private v: number[] = [];

  constructor(private map: MapLibreMap) {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:absolute;inset:0;pointer-events:none;";
    map.getCanvasContainer().appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.resize();
    map.on("resize", this.resize);
    map.on("movestart", this.clear);
    map.on("move", this.clear);
  }

  setField(grid: SmokeGrid, u: number[], v: number[]) {
    const fresh = this.grid === null;

    this.grid = grid;
    this.u = u;
    this.v = v;
    if (fresh) this.particles = Array.from({ length: PARTICLES }, () => this.spawn(true));
  }

  start() {
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.clear();
  }

  remove() {
    this.stop();
    this.map.off("resize", this.resize);
    this.map.off("movestart", this.clear);
    this.map.off("move", this.clear);
    this.canvas.remove();
  }

  private resize = () => {
    const { clientWidth, clientHeight } = this.map.getCanvas();
    const ratio = window.devicePixelRatio || 1;

    this.canvas.width = clientWidth * ratio;
    this.canvas.height = clientHeight * ratio;
    this.canvas.style.width = `${clientWidth}px`;
    this.canvas.style.height = `${clientHeight}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  private clear = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  private spawn(randomAge = false): Particle {
    const [w, s, e, n] = gridBounds(this.grid!);
    // Utamakan area yang sedang terlihat di layar
    const view = this.map.getBounds();
    const west = Math.max(w, view.getWest());
    const east = Math.min(e, view.getEast());
    const south = Math.max(s, view.getSouth());
    const north = Math.min(n, view.getNorth());
    const ok = west < east && south < north;

    return {
      lon: ok ? west + Math.random() * (east - west) : w + Math.random() * (e - w),
      lat: ok ? south + Math.random() * (north - south) : s + Math.random() * (n - s),
      age: randomAge ? Math.floor(Math.random() * MAX_AGE) : 0,
    };
  }

  private tick = () => {
    this.frame = requestAnimationFrame(this.tick);
    if (!this.grid) return;

    const ctx = this.ctx;
    const { width, height } = this.canvas;

    // Pudarkan jejak lama
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();

    for (let k = 0; k < this.particles.length; k++) {
      const p = this.particles[k];
      const u = sampleGrid(this.u, this.grid, p.lon, p.lat);
      const v = sampleGrid(this.v, this.grid, p.lon, p.lat);

      if (u === null || v === null || p.age++ > MAX_AGE) {
        this.particles[k] = this.spawn();
        continue;
      }

      const from = this.map.project([p.lon, p.lat]);
      const to = { x: from.x + u * SPEED, y: from.y - v * SPEED };
      const next = this.map.unproject([to.x, to.y]);

      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      p.lon = next.lng;
      p.lat = next.lat;
    }

    ctx.stroke();
  };
}
