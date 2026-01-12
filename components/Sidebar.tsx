
import React, { useState } from 'react';
import { analyzeRegion } from '../services/aiService';

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
  osmData: any;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onDownload, 
  isLoading, 
  selectedArea, 
  hasResults, 
  config, 
  setConfig,
  osmData
}) => {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const tagOptions = [
    { label: 'المباني والمنشآت', value: 'building', icon: '🏢' },
    { label: 'شبكة الطرق والنقل', value: 'highway', icon: '🛣️' },
    { label: 'المرافق العامة', value: 'amenity', icon: '🏥' },
    { label: 'المساحات الخضراء', value: 'leisure', icon: '🌳' },
    { label: 'المحلات والتجارة', value: 'shop', icon: '🛒' },
    { label: 'السياحة والآثار', value: 'tourism', icon: '📸' },
  ];

  const handleTagToggle = (tag: string) => {
    setConfig(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  const handleAiAnalyze = async () => {
    if (!osmData) return;
    setIsAnalyzing(true);
    const result = await analyzeRegion(osmData);
    setAiInsight(result || null);
    setIsAnalyzing(false);
  };

  return (
    <div className="w-full md:w-96 bg-white shadow-2xl h-full flex flex-col z-10 border-l border-gray-200 overflow-hidden">
      <div className="p-6 bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <span>🛰️</span>
          GEO-Extract
        </h1>
        <p className="text-blue-100 text-[10px] mt-1 uppercase tracking-widest font-bold opacity-80">Professional GIS Tools</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* قسم التحليل الذكي */}
        {hasResults && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
              <span className="w-1.5 h-4 bg-purple-500 rounded-full ml-2"></span>
              تحليل المنطقة الذكي
            </h3>
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              {aiInsight ? (
                <div className="text-xs text-purple-900 leading-relaxed italic">
                  "{aiInsight}"
                </div>
              ) : (
                <button 
                  onClick={handleAiAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? "جاري التفكير..." : "✨ اطلب تحليلاً للمنطقة"}
                </button>
              )}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full ml-2"></span>
            تصفية البيانات المطلوبة
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'points', label: 'نقاط', icon: '📍' },
              { id: 'lines', label: 'خطوط', icon: '🛣️' },
              { id: 'polygons', label: 'مضلعات', icon: '⬢' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setConfig(prev => ({ ...prev, [type.id]: !prev[type.id as keyof typeof prev] }))}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-300 ${
                  config[type.id as keyof typeof config] 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' 
                    : 'border-gray-50 bg-gray-50 text-gray-400 opacity-60'
                }`}
              >
                <span className="text-xl mb-1">{type.icon}</span>
                <span className="text-[10px] font-bold">{type.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full ml-2"></span>
            التصنيفات الجغرافية
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {tagOptions.map(tag => (
              <label 
                key={tag.value} 
                className={`flex flex-col items-center p-3 rounded-2xl cursor-pointer border-2 transition-all hover:scale-105 ${
                  config.tags.includes(tag.value) 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                    : 'border-gray-50 bg-white text-gray-500'
                }`}
              >
                <input 
                  type="checkbox" 
                  hidden
                  checked={config.tags.includes(tag.value)} 
                  onChange={() => handleTagToggle(tag.value)}
                />
                <span className="text-xl mb-1">{tag.icon}</span>
                <span className="text-[10px] font-bold text-center">{tag.label}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
        {!selectedArea && (
          <div className="mb-4 flex items-center bg-amber-50 text-amber-700 p-4 rounded-2xl text-[10px] font-bold border border-amber-100">
            <span className="ml-2 text-lg">👉</span>
            استخدم أدوات الرسم على الخريطة لتحديد منطقة معينة
          </div>
        )}
        
        <button
          onClick={onDownload}
          disabled={!selectedArea || isLoading}
          className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-xl flex items-center justify-center gap-3
            ${!selectedArea || isLoading 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200'}`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>جاري المعالجة...</span>
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>{hasResults ? 'تصدير البيانات (GeoJSON)' : 'استخراج بيانات المنطقة'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
