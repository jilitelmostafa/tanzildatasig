
import osmtogeojson from 'https://cdn.skypack.dev/osmtogeojson';

export const fetchOSMData = async (polygonCoords: [number, number][], config: { points: boolean; lines: boolean; polygons: boolean; tags: string[] }) => {
  // Convert [lat, lon] to "lat lon" string for Overpass
  const polyStr = polygonCoords.map(coord => `${coord[0]} ${coord[1]}`).join(' ');

  // Fix: Instead of an invalid regex logic for key selection, we build a proper 
  // Overpass union of queries for each selected tag.
  const filter = config.tags.length > 0 
    ? config.tags.map(tag => `nwr["${tag}"](poly:"${polyStr}");`).join('\n')
    : `nwr(poly:"${polyStr}");`;

  const query = `
    [out:json][timeout:60];
    (
      ${filter}
    );
    out body;
    >;
    out skel qt;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('فشل الاتصال بـ Overpass API');
  }

  const data = await response.json();
  
  // Convert OSM JSON to GeoJSON
  const geojson = osmtogeojson(data);
  
  // Filter GeoJSON by geometry if needed (though Overpass poly filter does most work)
  return geojson;
};

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
