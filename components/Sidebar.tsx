
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

const Sidebar: React.FC<SidebarProps> = ({ onDownload, isLoading, selectedArea, hasResults, config, setConfig }) => {
  // جرد الأصناف الكبرى المتوفرة في OSM
  const tagOptions = [
    { label: 'المباني والمنشآت', value: 'building', icon: '🏢' },
    { label: 'شبكة الطرق والنقل', value: 'highway', icon: '🛣️' },
    { label: 'المرافق العامة (صحة، تعليم)', value: 'amenity', icon: '🏥' },
    { label: 'المساحات الخضراء والترفيه', value: 'leisure', icon: '🌳' },
    { label: 'المعالم الطبيعية والبيئة', value: 'natural', icon: '⛰️' },
    { label: 'الحدود الإدارية', value: 'boundary', icon: '🗺️' },
    { label: 'المحلات والتجارة', value: 'shop', icon: '🛒' },
    { label: 'السياحة والآثار', value: 'tourism', icon: '📸' },
    { label: 'استخدامات الأراضي', value: 'landuse', icon: '🚜' },
  ];

  const handleTagToggle = (tag: string) => {
    setConfig(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  return (
    <div className="w-full md:w-96 bg-white shadow-2xl h-full flex flex-col z-10 border-l border-gray-200 overflow-hidden">
      <div className="p-6 bg-blue-600 text-white">
        <h1 className="text-xl font-bold flex items-center">
          <span className="mr-2">🌍</span>
          مستخرج بيانات OSM
        </h1>
        <p className="text-blue-100 text-xs mt-1">خرائط تفاعلية وأدوات جغرافية احترافية</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full ml-2"></span>
            نوع الهندسة المطلوبة
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'points', label: 'نقاط', icon: '📍' },
              { id: 'lines', label: 'خطوط', icon: '🛤️' },
              { id: 'polygons', label: 'مضلعات', icon: '⬢' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setConfig(prev => ({ ...prev, [type.id]: !prev[type.id as keyof typeof prev] }))}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                  config[type.id as keyof typeof config] 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'
                }`}
              >
                <span className="text-xl mb-1">{type.icon}</span>
                <span className="text-xs font-bold">{type.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full ml-2"></span>
            تصنيف المعطيات (Tags)
          </h3>
          <div className="space-y-1.5">
            {tagOptions.map(tag => (
              <label 
                key={tag.value} 
                className={`flex items-center p-3 rounded-lg cursor-pointer border transition-all hover:bg-gray-50 ${
                  config.tags.includes(tag.value) ? 'border-blue-200 bg-blue-50/30' : 'border-transparent'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={config.tags.includes(tag.value)} 
                  onChange={() => handleTagToggle(tag.value)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="mr-3 text-sm text-gray-700 flex-1">{tag.label}</span>
                <span className="text-sm opacity-60">{tag.icon}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-3">
        {!selectedArea && (
          <div className="flex items-center bg-amber-50 text-amber-700 p-3 rounded-lg text-xs font-medium border border-amber-100 italic">
            <span className="ml-2">⚠️</span>
            الرجاء رسم منطقة التحديد على الخريطة أولاً
          </div>
        )}
        
        <button
          onClick={onDownload}
          disabled={!selectedArea || isLoading}
          className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg flex items-center justify-center space-x-2 space-x-reverse
            ${!selectedArea || isLoading 
              ? 'bg-gray-300 cursor-not-allowed shadow-none' 
              : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}`}
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>{hasResults ? 'تحميل البيانات الحالية' : 'جلب ومعاينة البيانات'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
