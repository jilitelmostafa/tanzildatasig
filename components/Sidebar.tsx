
import React from 'react';

interface SidebarProps {
  onDownload: () => void;
  isLoading: boolean;
  selectedArea: boolean;
  hasResults: boolean;
  config: {
    points: boolean;
    lines: boolean;
    polygons: boolean;
    tags: string[];
  };
  setConfig: React.Dispatch<React.SetStateAction<{
    points: boolean;
    lines: boolean;
    polygons: boolean;
    tags: string[];
  }>>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onDownload, 
  isLoading, 
  selectedArea, 
  hasResults, 
  config, 
  setConfig 
}) => {
  return (
    <div className="w-full md:w-80 bg-white h-full flex flex-col z-10 border-l border-gray-200">
      <div className="p-5 bg-gray-800 text-white">
        <h1 className="text-lg font-bold">مستخرج OSM</h1>
      </div>

      <div className="flex-1 p-5 space-y-6">
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-4">نوع الهندسة المطلوبة</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'points', label: 'نقاط (Points)', icon: '📍' },
              { id: 'lines', label: 'خطوط (Lines)', icon: '🛤️' },
              { id: 'polygons', label: 'مضلعات (Polygons)', icon: '⬢' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setConfig(prev => ({ ...prev, [type.id]: !prev[type.id as keyof typeof prev] }))}
                className={`flex items-center p-3 rounded-lg border transition-colors ${
                  config[type.id as keyof typeof config] 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                <span className="ml-3">{type.icon}</span>
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="p-5 border-t border-gray-200">
        <button
          onClick={onDownload}
          disabled={!selectedArea || isLoading}
          className={`w-full py-3 rounded font-bold text-white transition-all
            ${!selectedArea || isLoading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isLoading ? 'جاري التحميل...' : (hasResults ? 'تحميل GeoJSON' : 'جلب البيانات')}
        </button>
        {!selectedArea && (
          <p className="text-[10px] text-red-500 mt-2 text-center font-bold">
            حدد منطقة على الخريطة أولاً
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
