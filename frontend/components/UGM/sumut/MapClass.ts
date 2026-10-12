export class FancyCompass implements maplibregl.IControl {
  private map!: maplibregl.Map;
  private container!: HTMLElement;

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;

    this.container = document.createElement("div");
    this.container.className = "fancy-compass";

    this.container.innerHTML = `
      <svg class="compass-icon" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" stroke="white" stroke-width="4" fill="rgba(0,0,0,0.4)" />
        <polygon points="50,15 60,50 50,85 40,50"
                 fill="#ff4d4d" stroke="white" stroke-width="2"/>
      </svg>
    `;

    this.container.addEventListener("click", () => {
      this.map.resetNorth({ duration: 500 });
    });

    this.map.on("rotate", this.updateBearing);
    this.updateBearing();

    return this.container;
  }

  onRemove(): void {
    this.container.remove();
    this.map.off("rotate", this.updateBearing);
  }

  private updateBearing = () => {
    const bearing = this.map.getBearing();
    const icon = this.container.querySelector(".compass-icon") as HTMLElement;
    icon.style.transform = `rotate(${-bearing}deg)`;
  };
}

// XYZ Tiles URLs untuk setiap epoch
export const epochTilesUrl: Record<number, string> = {
  2021: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg",
  2022: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2022_3857/default/g/{z}/{y}/{x}.jpg",
  2023: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg",
  2024: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
  2025: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
};

// GeoJSON URLs
export const epochGeojson: Record<number, string> = {
  2021: "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/assets/sumut/MUSIM_MAS_2019_2.geojson",
  2022: "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/assets/sumut/MUSIM_MAS_2020_2.geojson",
  2023: "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/assets/sumut/MUSIM_MAS_2020_2.geojson",
  2024: "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/assets/sumut/MUSIM_MAS_2020_2.geojson",
  2025: "https://digital-twin-ugm.s3.ap-southeast-1.amazonaws.com/assets/sumut/MUSIM_MAS_2020_2.geojson",
};
export const epochPbfTilesUrl: Record<number, string> = {
  2021: "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2021.pmtiles",
  2022: "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2022.pmtiles",
  2023: "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2023.pmtiles",
  2024: "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2024.pmtiles",
  2025: "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2025.pmtiles",
};
export interface EpochOption {
  value: number;
  label: string;
}

export const epochSliderOptions: EpochOption[] = [
  { value: 2021, label: "2021" },
  { value: 2022, label: "2022" },
  { value: 2023, label: "2023" },
  { value: 2024, label: "2024" },
  { value: 2025, label: "2025" },
];

export const landCoverChartMockData = {
  2021: {
    1: 24000000,
    2: 3000000,
    3: 2000000,
    4: 1500000,
    5: 500000,
    6: 5000000,
    7: 1000000,
    8: 800000,
    9: 1200000,
    10: 2000000,
  },
  2022: {
    1: 23500000,
    2: 3200000,
    3: 2200000,
    4: 1500000,
    5: 600000,
    6: 5200000,
    7: 1000000,
    8: 800000,
    9: 1000000,
    10: 2000000,
  },
  2023: {
    1: 23000000,
    2: 3500000,
    3: 2500000,
    4: 1500000,
    5: 700000,
    6: 5400000,
    7: 1000000,
    8: 800000,
    9: 800000,
    10: 1800000,
  },
  2024: {
    1: 22500000,
    2: 3800000,
    3: 2800000,
    4: 1500000,
    5: 800000,
    6: 5600000,
    7: 1000000,
    8: 800000,
    9: 600000,
    10: 1600000,
  },
  2025: {
    1: 22000000,
    2: 4000000,
    3: 3000000,
    4: 1500000,
    5: 900000,
    6: 5800000,
    7: 1000000,
    8: 800000,
    9: 500000,
    10: 1500000,
  },
};
