
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, GeoJSON, Popup } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import Sidebar from './components/Sidebar';
import { fetchOSMData, downloadGeoJSON } from './services/overpassService';
import { GoogleGenAI } from "@google/genai";

// أيقونة مخصصة للنقاط المستخرجة
const customPointMarker = (feature: any, latlng: L.LatLng) => {
  return L.circleMarker(latlng, {
    radius: 6,
    fillColor: "#ef4444",
    color: "#fff",
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

    // Fix: Cast 'ar' to any because 'ar' might be missing from the SupportLocales type definition 
    // despite being supported by the library at runtime.
    map.pm.setLang('ar' as any);

    // تحديد النمط البصري للمضلع المرسوم (أزرق بوزن واضح)
    const drawStyle = {
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 3,
      dashArray: '5, 5'
    };
    
    map.pm.setPathOptions(drawStyle);

    map.on('pm:create', (e: any) => {
      const layer = e.layer;
      if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        const coords: [number, number][] = latlngs.map(ll => [ll.lat, ll.lng]);
        onPolygonCreated(coords);

        // مسح المضلعات السابقة لضمان تحديد منطقة واحدة
        map.eachLayer((l: any) => {
          if (l instanceof L.Polygon && l !== layer && (l as any).pm) {
            map.removeLayer(l);
          }
        });
      }
    });

    map.on('pm:remove', () => onPolygonDeleted());

    return () => { map.pm.removeControls(); };
  }, [map, onPolygonCreated, onPolygonDeleted]);

  return null;
};

const App: React.FC = () => {
  const [selectedPolygon, setSelectedPolygon] = useState<[number, number][] | null>(null);
  const [osmData, setOsmData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [config, setConfig] = useState({
    points: true,
    lines: true,
    polygons: true,
    tags: [] as string[]
  });

  const handleAction = async () => {
    if (!selectedPolygon) return;
    
    // إذا كانت البيانات موجودة مسبقاً، نقوم بتحميلها كملف
    if (osmData) {
      downloadGeoJSON(osmData, `osm_extract_${new Date().getTime()}`);
      return;
    }

    setIsLoading(true);
    setAiAnalysis(null);
    try {
      const data = await fetchOSMData(selectedPolygon, config);
      if (data.features.length === 0) {
        alert('لم يتم العثور على بيانات في هذه المنطقة. حاول توسيع المنطقة أو تغيير الأصناف.');
      } else {
        setOsmData(data);
      }
    } catch (err) {
      alert('خطأ في جلب البيانات من Overpass API.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fix: Added AI Analysis function using Gemini to provide insights on the extracted data
  const analyzeData = async () => {
    if (!osmData) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Extract a summary of features for context
      const featuresSummary = osmData.features.slice(0, 40).map((f: any) => {
        const p = f.properties || {};
        return {
          name: p.name || p['name:ar'] || 'غير مسمى',
          type: p.building ? 'مبنى' : (p.highway ? 'طريق' : (p.amenity || p.landuse || 'معلم')),
          category: p.amenity || p.shop || p.tourism || 'عام'
        };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `بصفتك خبيرًا في البيانات الجغرافية، قم بتحليل قائمة المعالم التالية من خريطة OpenStreetMap وقدم تقريرًا موجزًا (4-5 جمل) باللغة العربية حول طابع هذه المنطقة (مثلاً: سكنية، تجارية، سياحية، إلخ) وما هي أبرز مكوناتها المكتشفة: ${JSON.stringify(featuresSummary)}`,
      });
      setAiAnalysis(response.text);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setAiAnalysis("فشل التحليل الذكي للبيانات حالياً.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // تصفير النتائج عند تغيير منطقة التحديد
  const resetData = useCallback(() => {
    setOsmData(null);
    setSelectedPolygon(null);
    setAiAnalysis(null);
  }, []);

  const setPolygon = useCallback((coords: [number, number][]) => {
    setOsmData(null);
    setSelectedPolygon(coords);
    setAiAnalysis(null);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      <Sidebar 
        onDownload={handleAction} 
        isLoading={isLoading} 
        selectedArea={!!selectedPolygon}
        hasResults={!!osmData}
        config={config}
        setConfig={setConfig}
      />

      <div className="flex-1 relative">
        <MapContainer 
          center={[34.0209, -6.8416]} 
          zoom={13} 
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OSM contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          
          <GeomanControls 
            onPolygonCreated={setPolygon} 
            onPolygonDeleted={resetData}
          />

          {/* عرض البيانات المستخرجة على الخريطة */}
          {osmData && (
            <GeoJSON 
              data={osmData} 
              pointToLayer={customPointMarker}
              style={(feature) => ({
                color: feature?.geometry?.type === 'LineString' ? '#3b82f6' : '#10b981',
                weight: 2,
                fillOpacity: 0.4
              })}
              onEachFeature={(feature, layer) => {
                const tags = feature.properties || {};
                const name = tags.name || tags['name:ar'] || 'بدون اسم';
                layer.bindPopup(`
                  <div class="p-2 font-sans">
                    <h4 class="font-bold text-blue-600 mb-1 border-b pb-1">${name}</h4>
                    <div class="text-[10px] space-y-1 overflow-auto max-h-32">
                      ${Object.entries(tags).map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('')}
                    </div>
                  </div>
                `);
              }}
            />
          )}
        </MapContainer>

        {/* AI Analysis Button and Result Card */}
        {osmData && !isLoading && (
          <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end space-y-2">
            <button 
              onClick={analyzeData}
              disabled={isAnalyzing}
              className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-blue-200 text-blue-700 font-bold flex items-center hover:bg-white transition-all active:scale-95"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-2"></div>
              ) : (
                <span className="ml-2">🤖</span>
              )}
              تحليل المنطقة بالذكاء الاصطناعي
            </button>
            
            {aiAnalysis && (
              <div className="max-w-xs bg-white p-4 rounded-xl shadow-2xl border border-blue-100 text-sm text-gray-700 animate-in fade-in slide-in-from-top-2">
                <div className="font-bold text-blue-600 mb-1 flex items-center">
                  <span>✨ رؤية ذكية للمنطقة:</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                <button 
                  onClick={() => setAiAnalysis(null)}
                  className="mt-2 text-[10px] text-gray-400 hover:text-gray-600"
                >
                  إغلاق التحليل
                </button>
              </div>
            )}
          </div>
        )}

        {/* مؤشر التحميل */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[2000] flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="mt-4 font-bold text-gray-800">جاري استخراج المعطيات...</span>
            </div>
          </div>
        )}

        {/* دليل المستخدم العائم */}
        {!selectedPolygon && !isLoading && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="bg-gray-900/80 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl flex items-center border border-white/20">
              <span className="animate-pulse ml-2">🖱️</span>
              اختر أداة المضلع من اليسار لرسم منطقة البحث
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
