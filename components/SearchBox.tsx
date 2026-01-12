
import React, { useState } from 'react';
import { useMap } from 'react-leaflet';

const SearchBox: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const map = useMap();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ar`);
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error("خطأ في البحث:", error);
    }
  };

  const goToLocation = (lat: string, lon: string, displayName: string) => {
    map.flyTo([parseFloat(lat), parseFloat(lon)], 15);
    setQuery(displayName);
    setShowResults(false);
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
      <form onSubmit={handleSearch} className="relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مكان، مدينة، أو إحداثيات..."
          className="w-full h-12 pr-12 pl-4 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
        />
        <button 
          type="submit"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {showResults && results.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
            {results.map((res, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToLocation(res.lat, res.lon, res.display_name)}
                className="w-full p-3 text-right text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex items-center space-x-2 space-x-reverse"
              >
                <span className="text-blue-500">📍</span>
                <span className="truncate">{res.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBox;
