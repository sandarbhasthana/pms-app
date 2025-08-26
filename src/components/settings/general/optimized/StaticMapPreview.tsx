"use client";

import { useState } from "react";
import { MapPin, Edit3 } from "lucide-react";

interface StaticMapPreviewProps {
  lat: number;
  lng: number;
  onEditClick: () => void;
  locationAccuracy?: string;
}

export default function StaticMapPreview({ 
  lat, 
  lng, 
  onEditClick, 
  locationAccuracy = "approximate" 
}: StaticMapPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Generate Google Static Maps URL
  const getStaticMapUrl = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return null;
    }

    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: '16',
      size: '600x300',
      scale: '2', // High DPI
      maptype: 'roadmap',
      markers: `color:red|${lat},${lng}`,
      key: apiKey
    });

    return `${baseUrl}?${params.toString()}`;
  };

  const staticMapUrl = getStaticMapUrl();

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Fallback when no API key or image fails to load
  if (!staticMapUrl || imageError) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-md flex flex-col items-center justify-center cursor-pointer hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-200"
           onClick={onEditClick}>
        <MapPin className="w-12 h-12 text-gray-400 mb-2" />
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
          Location: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mb-3">
          Accuracy: {locationAccuracy}
        </p>
        <button className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Edit3 className="w-4 h-4" />
          Edit Location
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full cursor-pointer group" onClick={onEditClick}>
      {/* Loading skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400 text-sm">Loading map preview...</div>
        </div>
      )}

      {/* Static map image */}
      <img
        src={staticMapUrl}
        alt={`Map showing location at ${lat}, ${lng}`}
        className={`w-full h-full object-cover rounded-md transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {/* Overlay with edit button */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-md flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform group-hover:scale-105">
          <button className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-md shadow-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Edit3 className="w-4 h-4" />
            Edit Location
          </button>
        </div>
      </div>

      {/* Location info overlay */}
      <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
        </div>
        <div className="text-gray-600 dark:text-gray-400">
          {locationAccuracy === "precise" ? "📍 Precise" : "📍 Approximate"}
        </div>
      </div>

      {/* Performance indicator */}
      <div className="absolute top-2 right-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs font-medium">
        Static Preview (~5KB)
      </div>
    </div>
  );
}
