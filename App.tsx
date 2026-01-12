
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, GeoJSON, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import Sidebar from './components/Sidebar';
import SearchBox from './components/SearchBox';
import { fetchOSMData, downloadGeoJSON } from './services/overpassService';

const customPointMarker = (feature: any, latlng: L.LatLng) => {
  return L.circleMarker(latlng, {
    radius: 7,
    fillColor: "#3b82f6",
    color: "#ffffff",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  });
};

const GeomanControls: React.FC<{ 
  onPolygonCreated: (coords: [number, number][]) => void, 
  onPolygonDeleted: () => void 
}> = ({ onPolygonCreated, onPolygonDeleted }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: false,
      editMode: true,
      dragMode: true,
      removalMode: true,
    });

    try {
      (map.pm as any).setLang('ar');
    } catch (e) {}

    const drawStyle = {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 3,
      dashArray: '8, 8'
    };
    
    map.pm.setPathOptions(drawStyle);

    map.on('pm:create', (e: any) => {
      const layer = e.layer;
      if (layer instanceof L.Polygon) {
        layer.setStyle(drawStyle);
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        const coords: [number, number][] = latlngs.map(ll => [ll.lat, ll.lng]);
        onPolygonCreated(coords);

        map.eachLayer((l: any) => {
          if (l instanceof L.Polygon && l !== layer && (l as any).pm) {
            map.removeLayer(l);
          }
        });

        layer.on('pm:edit', () => {
          const updatedLatLngs = layer.getLatLngs()[0] as L.LatLng[];
          const updatedCoords: [number, number][] = updatedLatLngs.map(ll => [ll.lat, ll.lng]);
          onPolygonCreated(updatedCoords);
        });
      }
    });

    map.on('pm:remove', () => onPolygonDeleted());

    return () => { 
      if (map.pm) map.pm.removeControls(); 
    };
  }, [map, onPolygonCreated, onPolygonDeleted]);

  return null;
};

const App: React.FC = () => {
  const [selectedPolygon, setSelectedPolygon] = useState<[number, number][] | null>(null);
  const [osmData, setOsmData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({
    points: true,
    lines: true,
    polygons: true,
    tags: [] as string[]
  });

  const handleAction = async () => {
    if (!selectedPolygon) return;
    
    if (osmData) {
      downloadGeoJSON(osmData, `osm_extract_${new Date().getTime()}`);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchOSMData(selectedPolygon, config);
      if (!data || !data.features || data.features.length === 0) {
        alert('لم يتم العثور على بيانات في هذه المنطقة. حاول اختيار أصناف مختلفة أو توسيع المنطقة.');
      } else {
        setOsmData(data);
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetData = useCallback(() => {
    setOsmData(null);
    setSelectedPolygon(null);
  }, []);

  const setPolygon = useCallback((coords: [number, number][]) => {
    setOsmData(null);
    setSelectedPolygon(coords);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-gray-50">
      <Sidebar 
        onDownload={handleAction} 
        isLoading={isLoading} 
        selectedArea={!!selectedPolygon}
        hasResults={!!osmData}
        config={config}
        setConfig={setConfig}
        osmData={osmData}
      />

      <div className="flex-1 relative order-first md:order-last">
        <MapContainer 
          center={[24.7136, 46.6753]} 
          zoom={12} 
          className="h-full w-full"
          zoomControl={false}
        >
          <SearchBox />
          
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="خريطة الشوارع">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="خريطة مظلمة">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="تضاريس">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          
          <GeomanControls 
            onPolygonCreated={setPolygon} 
            onPolygonDeleted={resetData}
          />

          {osmData && (
            <GeoJSON 
              data={osmData} 
              pointToLayer={customPointMarker}
              style={(feature) => ({
                color: feature?.geometry?.type === 'LineString' ? '#6366f1' : '#10b981',
                weight: 4,
                opacity: 0.9,
                fillOpacity: 0.2
              })}
              onEachFeature={(feature, layer) => {
                const tags = feature.properties || {};
                const name = tags.name || tags['name:ar'] || 'عنصر غير مسمى';
                layer.bindPopup(`
                  <div class="p-3 min-w-[200px] dir-rtl text-right">
                    <h4 class="font-bold text-blue-800 border-b border-gray-100 pb-2 mb-2">${name}</h4>
                    <div class="text-[10px] space-y-1 max-h-48 overflow-y-auto">
                      ${Object.entries(tags).slice(0, 15).map(([k, v]) => `
                        <div class="flex justify-between gap-4 border-b border-gray-50 py-1">
                          <span class="text-gray-400 font-mono">${k}:</span>
                          <span class="text-gray-700 font-bold">${v}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `);
              }}
            />
          )}
        </MapContainer>

        {isLoading && (
          <div className="absolute inset-0 bg-blue-900/10 backdrop-blur-[2px] z-[2000] flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl flex flex-col items-center border border-white">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="mt-6 font-black text-blue-900 text-xl">جاري استخراج البيانات...</span>
              <p className="text-blue-400 text-xs mt-2">يرجى الانتظار، نحن نتواصل مع Overpass API</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
