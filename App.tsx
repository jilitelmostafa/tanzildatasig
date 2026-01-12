
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Draw } from 'ol/interaction';
import { Polygon } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import Overlay from 'ol/Overlay';
import Sidebar from './components/Sidebar';
import { fetchOSMData, downloadGeoJSON } from './services/overpassService';

const App: React.FC = () => {
  const mapElement = useRef<HTMLDivElement>(null);
  const popupElement = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [drawInteraction, setDrawInteraction] = useState<Draw | null>(null);
  const [selectedPolygon, setSelectedPolygon] = useState<[number, number][] | null>(null);
  const [osmData, setOsmData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [popupContent, setPopupContent] = useState<any>(null);
  
  const [config, setConfig] = useState({
    points: true,
    lines: true,
    polygons: true,
    tags: [] as string[]
  });

  const drawSourceRef = useRef(new VectorSource({ wrapX: false }));
  const resultsSourceRef = useRef(new VectorSource());

  useEffect(() => {
    if (!mapElement.current) return;

    // Fix: In modern OpenLayers, autoPan is an object that can contain an animation property.
    // The autoPanAnimation property is not directly on the Overlay options.
    const popupOverlay = new Overlay({
      element: popupElement.current!,
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });

    const initialMap = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            attributions: '© OpenStreetMap © CARTO'
          }),
        }),
        new VectorLayer({
          source: drawSourceRef.current,
          style: new Style({
            fill: new Fill({ color: 'rgba(37, 99, 235, 0.1)' }),
            stroke: new Stroke({ color: '#2563eb', width: 3, lineDash: [6, 6] }),
          }),
        }),
        new VectorLayer({
          source: resultsSourceRef.current,
          style: (feature) => {
            const geom = feature.getGeometry();
            const type = geom ? geom.getType() : '';
            if (type.includes('Point')) {
              return new Style({
                image: new CircleStyle({
                  radius: 7,
                  fill: new Fill({ color: '#ef4444' }),
                  stroke: new Stroke({ color: '#ffffff', width: 2 }),
                }),
              });
            }
            return new Style({
              stroke: new Stroke({ color: '#10b981', width: 2.5 }),
              fill: new Fill({ color: 'rgba(16, 185, 129, 0.2)' }),
            });
          },
        }),
      ],
      overlays: [popupOverlay],
      view: new View({
        center: fromLonLat([46.6753, 24.7136]), // الرياض
        zoom: 12,
      }),
    });

    initialMap.on('singleclick', (evt) => {
      const feature = initialMap.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature && feature.get('properties')) {
        setPopupContent(feature.get('properties'));
        popupOverlay.setPosition(evt.coordinate);
      } else {
        popupOverlay.setPosition(undefined);
      }
    });

    setMap(initialMap);

    return () => {
      initialMap.setTarget(undefined);
    };
  }, []);

  const toggleDrawing = useCallback(() => {
    if (!map) return;

    if (drawInteraction) {
      map.removeInteraction(drawInteraction);
      setDrawInteraction(null);
    } else {
      drawSourceRef.current.clear();
      setSelectedPolygon(null);
      
      const draw = new Draw({
        source: drawSourceRef.current,
        type: 'Polygon',
      });

      draw.on('drawend', (event) => {
        const geometry = event.feature.getGeometry() as Polygon;
        const coords = geometry.getCoordinates()[0];
        const lonLatCoords: [number, number][] = coords.map(c => {
          const ll = toLonLat(c);
          return [ll[1], ll[0]] as [number, number]; // [lat, lon]
        });
        setSelectedPolygon(lonLatCoords);
        setOsmData(null);
        resultsSourceRef.current.clear();
        
        map.removeInteraction(draw);
        setDrawInteraction(null);
      });

      map.addInteraction(draw);
      setDrawInteraction(draw);
    }
  }, [map, drawInteraction]);

  const handleAction = async () => {
    if (!selectedPolygon) return;
    
    if (osmData) {
      downloadGeoJSON(osmData, `osm_data_${Date.now()}`);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchOSMData(selectedPolygon, config);
      if (!data || !data.features || data.features.length === 0) {
        alert('لم يتم العثور على بيانات جغرافية في هذه المنطقة. حاول اختيار تصنيفات أخرى.');
      } else {
        setOsmData(data);
        const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
        const features = format.readFeatures(data);
        resultsSourceRef.current.clear();
        resultsSourceRef.current.addFeatures(features);
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden">
      <Sidebar 
        onDownload={handleAction} 
        isLoading={isLoading} 
        selectedArea={!!selectedPolygon}
        hasResults={!!osmData}
        config={config}
        setConfig={setConfig}
      />

      <div className="flex-1 relative order-first md:order-last bg-slate-200">
        <div ref={mapElement} className="h-full w-full outline-none" />

        {/* أدوات الخريطة */}
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
          <button 
            onClick={toggleDrawing}
            className={`px-5 py-3 rounded-2xl shadow-2xl font-bold transition-all flex items-center gap-2 border
              ${drawInteraction 
                ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                : 'bg-white text-slate-800 border-slate-100 hover:bg-slate-50'}`}
          >
            <span className="text-xl">{drawInteraction ? '⏹️' : '✏️'}</span>
            {drawInteraction ? 'إيقاف الرسم' : 'رسم منطقة بحث'}
          </button>
          
          <button 
            onClick={() => {
              drawSourceRef.current.clear();
              resultsSourceRef.current.clear();
              setSelectedPolygon(null);
              setOsmData(null);
            }}
            className="p-3 bg-white text-slate-600 rounded-2xl shadow-xl hover:text-red-600 transition-all border border-slate-100"
            title="مسح الخريطة"
          >
            🗑️ مسح النتائج
          </button>
        </div>

        {/* منبثق البيانات */}
        <div ref={popupElement} className="ol-popup">
          {popupContent && (
            <div dir="rtl" className="max-w-[300px]">
              <h4 className="font-bold text-blue-600 border-b border-slate-100 pb-2 mb-3 text-lg">
                {popupContent.name || popupContent['name:ar'] || 'معلم جغرافي'}
              </h4>
              <div className="text-xs space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {Object.entries(popupContent).map(([k, v]) => (
                  <div key={k} className="flex gap-2 border-b border-slate-50 pb-1">
                    <b className="text-slate-400 whitespace-nowrap">{k}:</b> 
                    <span className="text-slate-700 break-words">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* حالة التحميل */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-md z-[1000] flex items-center justify-center">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center border border-white/50">
              <div className="w-16 h-16 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-xl font-black text-slate-800">جاري التواصل مع خوادم OSM</h3>
              <p className="text-slate-500 mt-2">يرجى الانتظار، يتم معالجة البيانات الجغرافية...</p>
            </div>
          </div>
        )}

        {/* إرشاد المستخدم */}
        {!selectedPolygon && !isLoading && !drawInteraction && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 w-max pointer-events-none">
            <div className="bg-slate-900/90 backdrop-blur px-8 py-4 rounded-3xl shadow-2xl text-white flex items-center border border-white/10">
              <span className="ml-4 text-2xl">🌍</span>
              <p className="font-medium">ابدأ برسم منطقة على الخريطة باستخدام الزر في الأعلى</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
