
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, GeoJSON, Popup } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import Sidebar from './components/Sidebar';
import { fetchOSMData, downloadGeoJSON } from './services/overpassService';

// Custom marker for extracted points to make them stand out
const customPointMarker = (feature: any, latlng: L.LatLng) => {
  return L.circleMarker(latlng, {
    radius: 6,
    fillColor: "#ef4444", // Red-500
    color: "#ffffff",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  });
};

const GeomanControls: React.FC<{ 
  onPolygonCreated: (coords: [number, number][]) => void, 
  onPolygonDeleted: () => void 
}> = ({ onPolygonCreated, onPolygonDeleted }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Initialize Geoman controls
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

    // Set Arabic language if available, cast to any to bypass strict type checks
    try {
      (map.pm as any).setLang('ar');
    } catch (e) {
      console.warn("Could not set Geoman language to Arabic", e);
    }

    // Default style for drawn shapes
    const drawStyle = {
      color: '#2563eb', // Blue-600
      fillColor: '#3b82f6', // Blue-500
      fillOpacity: 0.2,
      weight: 3,
      dashArray: '5, 5'
    };
    
    map.pm.setPathOptions(drawStyle);

    // Event listener for when a polygon or rectangle is finished
    map.on('pm:create', (e: any) => {
      const layer = e.layer;
      if (layer instanceof L.Polygon) {
        // Apply styling
        layer.setStyle(drawStyle);

        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        const coords: [number, number][] = latlngs.map(ll => [ll.lat, ll.lng]);
        onPolygonCreated(coords);

        // Keep map clean: remove previous drawings
        map.eachLayer((l: any) => {
          if (l instanceof L.Polygon && l !== layer && (l as any).pm) {
            map.removeLayer(l);
          }
        });

        // Update coordinates on edit
        layer.on('pm:edit', () => {
          const updatedLatLngs = layer.getLatLngs()[0] as L.LatLng[];
          const updatedCoords: [number, number][] = updatedLatLngs.map(ll => [ll.lat, ll.lng]);
          onPolygonCreated(updatedCoords);
        });
      }
    });

    map.on('pm:remove', () => onPolygonDeleted());

    return () => { 
      if (map.pm) {
        map.pm.removeControls(); 
      }
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
    
    // If we already have data, download it
    if (osmData) {
      downloadGeoJSON(osmData, `osm_extract_${new Date().getTime()}`);
      return;
    }

    // Otherwise, fetch data from Overpass
    setIsLoading(true);
    try {
      const data = await fetchOSMData(selectedPolygon, config);
      if (!data || !data.features || data.features.length === 0) {
        alert('لم يتم العثور على بيانات في هذه المنطقة. حاول اختيار أصناف مختلفة أو توسيع المنطقة.');
      } else {
        setOsmData(data);
      }
    } catch (err: any) {
      console.error(err);
      alert(`خطأ في جلب البيانات: ${err.message || 'حدث خطأ غير متوقع'}`);
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
      />

      <div className="flex-1 relative order-first md:order-last">
        <MapContainer 
          center={[34.0209, -6.8416]} 
          zoom={13} 
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          
          <GeomanControls 
            onPolygonCreated={setPolygon} 
            onPolygonDeleted={resetData}
          />

          {/* Render extracted data */}
          {osmData && (
            <GeoJSON 
              data={osmData} 
              pointToLayer={customPointMarker}
              style={(feature) => ({
                color: feature?.geometry?.type === 'LineString' ? '#3b82f6' : '#10b981',
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.3
              })}
              onEachFeature={(feature, layer) => {
                const tags = feature.properties || {};
                const name = tags.name || tags['name:ar'] || 'بدون اسم';
                layer.bindPopup(`
                  <div class="p-2 min-w-[150px]">
                    <h4 class="font-bold text-blue-700 border-b border-gray-100 pb-2 mb-2">${name}</h4>
                    <div class="text-[11px] space-y-1 max-h-40 overflow-y-auto pr-1">
                      ${Object.entries(tags).length > 0 
                        ? Object.entries(tags).map(([k, v]) => `<div><span class="text-gray-400">${k}:</span> <span class="text-gray-700">${v}</span></div>`).join('') 
                        : '<div class="text-gray-400 italic">لا توجد وسوم إضافية</div>'}
                    </div>
                  </div>
                `);
              }}
            />
          )}
        </MapContainer>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] z-[2000] flex items-center justify-center">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="mt-5 font-bold text-gray-800 text-lg">جاري استخلاص المعطيات الجغرافية...</span>
            </div>
          </div>
        )}

        {/* Floating User Instruction */}
        {!selectedPolygon && !isLoading && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="bg-blue-900/90 backdrop-blur text-white px-8 py-3 rounded-full shadow-2xl flex items-center border border-white/20">
              <span className="animate-pulse ml-3">🎯</span>
              ارسم مضلعاً على الخريطة لتحديد نطاق البيانات
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
