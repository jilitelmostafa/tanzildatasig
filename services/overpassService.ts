
import osmtogeojson from 'osmtogeojson';

/**
 * Fetches data from Overpass API based on a polygon and configuration.
 */
export const fetchOSMData = async (polygonCoords: [number, number][], config: { points: boolean; lines: boolean; polygons: boolean; tags: string[] }) => {
  // Convert [lat, lon] to "lat lon" string for Overpass poly filter
  const polyStr = polygonCoords.map(coord => `${coord[0]} ${coord[1]}`).join(' ');

  // Build filters: if no tags, get everything. If tags, get nodes, ways, and relations for each tag.
  let filter = '';
  if (config.tags.length === 0) {
    filter = `nwr(poly:"${polyStr}");`;
  } else {
    // Create a union of filters for each tag to ensure we get all requested types
    const tagFilters = config.tags.map(tag => `nwr["${tag}"](poly:"${polyStr}");`).join('\n      ');
    filter = `(\n      ${tagFilters}\n    );`;
  }

  const query = `
    [out:json][timeout:60];
    ${filter}
    out body;
    >;
    out skel qt;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`فشل الاتصال بـ Overpass API: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  
  // Convert OSM JSON to GeoJSON using the library
  const geojson = typeof osmtogeojson === 'function' ? osmtogeojson(data) : (osmtogeojson as any).default ? (osmtogeojson as any).default(data) : data;
  
  return geojson;
};

/**
 * Downloads the data in GeoJSON format.
 */
export const downloadGeoJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.geojson`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
