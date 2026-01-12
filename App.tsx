
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
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

    const popupOverlay = new Overlay({
      element: popupElement.current!,
      autoPan: { animation: { duration: 250 } },
    });

    const initialMap = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: drawSourceRef.current,
          style: new Style({
            fill: new Fill({ color: 'rgba(0, 0, 255, 0.1)' }),
            stroke: new Stroke({ color: '#0000ff', width: 2 }),
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
                  radius: 5,
                  fill: new Fill({ color: 'red' }),
                  stroke: new Stroke({ color: 'white', width: 1 }),
                }),
              });
            }
            return new Style({
              stroke: new Stroke({ color: 'green', width: 2 }),
              fill: new Fill({ color: 'rgba(0, 255, 0, 0.1)' }),
            });
          },
        }),
      ],
      overlays: [popupOverlay],
      view: new View({
        center: fromLonLat([46.6753, 24.7136]),
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

    return () => initialMap.setTarget(undefined);
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
          return [ll[1], ll[0]] as [number, number];
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
      downloadGeoJSON(osmData, `osm_data`);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchOSMData(selectedPolygon, config);
      if (!data || !data.features || data.features.length === 0) {
        alert('لا توجد بيانات.');
      } else {
        setOsmData(data);
        const format = new GeoJSON({ featureProjection: 'EPSG:3857' });
        resultsSourceRef.current.clear();
        resultsSourceRef.current.addFeatures(format.readFeatures(data));
      }
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar 
        onDownload={handleAction} 
        isLoading={isLoading} 
        selectedArea={!!selectedPolygon}
        hasResults={!!osmData}
        config={config}
        setConfig={setConfig}
      />

      <div className="flex-1 relative">
        <div ref={mapElement} className="h-full w-full" />

        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <button 
            onClick={toggleDrawing}
            className={`px-4 py-2 rounded shadow font-bold ${drawInteraction ? 'bg-red-500 text-white' : 'bg-white text-black border'}`}
          >
            {drawInteraction ? 'إيقاف الرسم' : 'رسم منطقة'}
          </button>
          
          <button 
            onClick={() => {
              drawSourceRef.current.clear();
              resultsSourceRef.current.clear();
              setSelectedPolygon(null);
              setOsmData(null);
            }}
            className="px-4 py-2 bg-white text-black rounded shadow border"
          >
            مسح
          </button>
        </div>

        <div ref={popupElement} className="ol-popup">
          {popupContent && (
            <div dir="rtl" className="max-w-[250px]">
              <div className="text-xs space-y-1 max-h-[150px] overflow-y-auto">
                {Object.entries(popupContent).map(([k, v]) => (
                  <div key={k} className="border-b pb-1">
                    <b className="text-gray-500">{k}:</b> {String(v)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/50 z-[1000] flex items-center justify-center">
            <div className="bg-white p-5 rounded border shadow-lg">جاري التحميل...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
