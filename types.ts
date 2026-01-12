
export interface OSMFeature {
  id: number;
  type: string;
  tags: Record<string, string>;
  [key: string]: any;
}

export interface OSMQueryConfig {
  points: boolean;
  lines: boolean;
  polygons: boolean;
  tags: string[]; // e.g. ["building", "highway", "amenity"]
}

export type Coordinate = [number, number];
