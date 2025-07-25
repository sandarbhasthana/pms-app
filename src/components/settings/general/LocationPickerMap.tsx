"use client";

// TODO: Migrate from deprecated google.maps.Marker to google.maps.marker.AdvancedMarkerElement
// when @react-google-maps/api library supports it or implement custom AdvancedMarker component
// Reference: https://developers.google.com/maps/documentation/javascript/advanced-markers/migration

import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { useTheme } from "next-themes";

// Keep libraries array as a constant to prevent reloading
const GOOGLE_MAPS_LIBRARIES: ("places" | "marker")[] = ["places", "marker"];

type Props = {
  lat: number;
  lng: number;
  setLat: Dispatch<SetStateAction<number>>;
  setLng: Dispatch<SetStateAction<number>>;
  onManualPositioning?: () => void; // Callback when user manually positions marker
  zoomLevel?: number; // Dynamic zoom level
  locationAccuracy?: string; // For accuracy-based zoom
};

const containerStyle = {
  width: "100%",
  height: "100%"
};

// 🎨 Dark theme style (customizable)
const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#304a7d" }]
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1626" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4e6d70" }]
  }
];

// Global loader configuration to prevent reloading
const LOADER_OPTIONS = {
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  libraries: GOOGLE_MAPS_LIBRARIES
};

const LocationPickerMap = ({
  lat,
  lng,
  setLat,
  setLng,
  onManualPositioning,
  zoomLevel,
  locationAccuracy
}: Props) => {
  const { isLoaded } = useJsApiLoader(LOADER_OPTIONS);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState(16); // Default zoom level

  // Calculate zoom level based on context
  const calculateZoomLevel = useCallback(() => {
    if (zoomLevel) {
      return zoomLevel; // Use provided zoom level
    }

    // Accuracy-based zoom levels
    if (locationAccuracy) {
      switch (locationAccuracy) {
        case "precise":
        case "exact":
          return 18; // Closest for precise locations
        case "interpolated":
          return 17; // Close for interpolated locations
        case "approximate":
        case "geometric_center":
        default:
          return 16; // Standard for approximate locations
      }
    }

    return 16; // Default zoom level
  }, [zoomLevel, locationAccuracy]);

  // Update zoom when context changes
  useEffect(() => {
    const newZoom = calculateZoomLevel();
    setCurrentZoom(newZoom);

    // Smoothly animate to new zoom if map is loaded
    if (mapRef.current && newZoom !== currentZoom) {
      console.log(`🔍 Updating zoom from ${currentZoom} to ${newZoom}`);
      mapRef.current.setZoom(newZoom);
    }
  }, [calculateZoomLevel, currentZoom]);

  // Suppress Google Maps warnings
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args[0]?.toString?.() || "";
      if (
        message.includes("google.maps.Marker is deprecated") ||
        message.includes("LoadScript has been reloaded unintentionally") ||
        message.includes("Performance warning! LoadScript")
      ) {
        return; // Suppress these specific warnings
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
    };
  }, []);

  const { resolvedTheme } = useTheme();

  const handleDrag = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setLat(e.latLng.lat());
        setLng(e.latLng.lng());
        console.log("📍 Marker dragged to:", e.latLng.lat(), e.latLng.lng());

        // Zoom in for precise manual positioning
        if (mapRef.current && currentZoom < 18) {
          console.log("🔍 Zooming to 18 for manual positioning");
          mapRef.current.setZoom(18);
          setCurrentZoom(18);
        }

        // Notify parent that coordinates were manually positioned
        onManualPositioning?.();
      }
    },
    [setLat, setLng, onManualPositioning, currentZoom]
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setLat(e.latLng.lat());
        setLng(e.latLng.lng());
        console.log("🎯 Map clicked at:", e.latLng.lat(), e.latLng.lng());

        // Zoom in for precise manual positioning
        if (mapRef.current && currentZoom < 18) {
          console.log("🔍 Zooming to 18 for manual positioning");
          mapRef.current.setZoom(18);
          setCurrentZoom(18);
        }

        // Notify parent that coordinates were manually positioned
        onManualPositioning?.();
      }
    },
    [setLat, setLng, onManualPositioning, currentZoom]
  );

  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: resolvedTheme === "dark" ? darkMapStyle : undefined
  };

  // Handle map load
  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      console.log("🗺️ Map loaded with zoom:", currentZoom);
    },
    [currentZoom]
  );

  if (!isLoaded)
    return (
      <div className="flex justify-center items-center h-full">
        Loading map…
      </div>
    );

  // Ensure coordinates are valid finite numbers
  if (!isFinite(lat) || !isFinite(lng)) {
    return (
      <div className="flex justify-center items-center h-full">
        Invalid coordinates. Please check your location settings.
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat, lng }}
      zoom={currentZoom}
      options={mapOptions}
      onClick={handleMapClick}
      onLoad={handleMapLoad}
    >
      <Marker position={{ lat, lng }} draggable onDragEnd={handleDrag} />
    </GoogleMap>
  );
};

export default LocationPickerMap;
