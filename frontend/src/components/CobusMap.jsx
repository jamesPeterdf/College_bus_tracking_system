import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Bus Icon
const busIcon = new L.Icon({
    iconUrl: '/bus-marker.png',
    iconSize: [40, 40], // Adjust based on your image dimensions
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

// Custom minimalist stop icon (home/destination)
const stopIcon = new L.DivIcon({
    html: `
        <div class="relative flex flex-col items-center justify-center">
            <div class="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-600 relative z-10 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div class="w-2 h-2 rounded-full bg-slate-800 -mt-1 relative z-20"></div>
        </div>
    `,
    className: 'custom-stop-marker',
    iconSize: [40, 48],
    iconAnchor: [20, 44],
    popupAnchor: [0, -44]
});

// Custom college icon
const collegeIcon = new L.DivIcon({
    html: `
        <div class="relative flex flex-col items-center justify-center">
            <div class="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)] border-2 border-indigo-400 relative z-10 text-white animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <div class="w-3 h-3 rounded-full bg-indigo-900 -mt-1.5 relative z-20 shadow-lg"></div>
        </div>
    `,
    className: 'custom-college-marker',
    iconSize: [48, 56],
    iconAnchor: [24, 52],
    popupAnchor: [0, -52]
});

// Custom specialized student marker
const targetStudentIcon = new L.DivIcon({
    html: `
        <div class="relative flex flex-col items-center justify-center animate-bounce">
            <div class="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] border-[3px] border-white relative z-10 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div class="w-2 h-2 rounded-full bg-emerald-700 -mt-[2px] relative z-20"></div>
            <div class="absolute -bottom-2 w-4 h-2 bg-black/30 rounded-[100%] blur-[2px]"></div>
        </div>
    `,
    className: 'custom-target-marker',
    iconSize: [48, 56],
    iconAnchor: [24, 52],
    popupAnchor: [0, -52]
});

// Component to dynamically update center
function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.panTo(center, { animate: true, duration: 1.0 });
        }
    }, [center, map]);
    return null;
}
const defaultCenter = [13.1354, 80.0453]; // Jaya Engineering College
const CobusMap = ({ markers = [], stops = [], busLocation = null, targetStop = null }) => {
    // Determine map center
    const center = busLocation ? [busLocation.lat, busLocation.lng] : defaultCenter;

    const [routeCoordinates, setRouteCoordinates] = useState([]);

    // Fetch road route from OSRM
    useEffect(() => {
        const fetchRoute = async () => {
            if (!busLocation || stops.length === 0) return;

            // Prefer explicitly defined target stop over the generalized list
            const destStop = targetStop || stops[0];
            const startLon = busLocation.lng;
            const startLat = busLocation.lat;
            const endLon = parseFloat(destStop.lng || destStop.longitude);
            const endLat = parseFloat(destStop.lat || destStop.latitude);

            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`);
                const data = await response.json();

                if (data.routes && data.routes.length > 0) {
                    // OSRM returns GeoJSON coordinates in [lon, lat], Leaflet Polyline needs [lat, lon]
                    const decodedRoute = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    setRouteCoordinates(decodedRoute);
                } else {
                    // Fallback to straight line
                    setRouteCoordinates([[startLat, startLon], [endLat, endLon]]);
                }
            } catch (err) {
                console.error("OSRM Routing Error:", err);
                setRouteCoordinates([[startLat, startLon], [endLat, endLon]]);
            }
        };

        fetchRoute();
    }, [busLocation, stops, targetStop]);

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={center}
                zoom={14}
                scrollWheelZoom={true}
                className="w-full h-full"
                zoomControl={false}
            >
                {/* CartoDB Voyager Tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <ChangeView center={center} />

                {/* Tracking Route Line matching roads */}
                {routeCoordinates.length > 0 && (
                    <>
                        {/* Glow Effect / Shadow Line */}
                        <Polyline
                            positions={routeCoordinates}
                            pathOptions={{
                                color: '#0ea5e9',
                                weight: 12,
                                opacity: 0.2,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }}
                        />
                        {/* Core Route Line */}
                        <Polyline
                            positions={routeCoordinates}
                            pathOptions={{
                                color: '#0ea5e9',
                                weight: 4,
                                opacity: 0.9,
                                dashArray: '1, 8',
                                lineCap: 'round',
                                lineJoin: 'round'
                            }}
                        />
                    </>
                )}

                {/* College Base Marker */}
                <Marker position={defaultCenter} icon={collegeIcon}>
                    <Popup className="custom-leaflet-popup">
                        <div className="font-outfit font-bold text-slate-800 text-center">
                            JAYA ENGINEERING COLLEGE
                            <div className="text-xs text-indigo-600 font-inter mt-1">MAIN CAMPUS</div>
                        </div>
                    </Popup>
                </Marker>

                {/* Stops Markers */}
                {stops.map((stop, i) => (
                    <Marker
                        key={i}
                        position={[parseFloat(stop.latitude), parseFloat(stop.longitude)]}
                        icon={stopIcon}
                    >
                        <Popup className="custom-leaflet-popup">
                            <div className="font-outfit font-bold text-slate-800">{stop.stop_name}</div>
                        </Popup>
                    </Marker>
                ))}

                {/* Target Student Origin Marker (Live GPS or Fallback) */}
                {targetStop && (
                    <Marker
                        position={[parseFloat(targetStop.lat || targetStop.latitude), parseFloat(targetStop.lng || targetStop.longitude)]}
                        icon={targetStudentIcon}
                        zIndexOffset={100} // Keep above standard stops
                    >
                        <Popup className="custom-leaflet-popup">
                            <div className="font-outfit font-bold text-center">
                                <div className="text-emerald-500 text-xs tracking-widest uppercase mb-1">Home Pin</div>
                                <div className="text-slate-800">{targetStop.stop_name || 'Your Live Location'}</div>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Live Bus Marker */}
                {busLocation && (
                    <Marker
                        position={[busLocation.lat, busLocation.lng]}
                        icon={busIcon}
                    >
                        <Popup className="custom-leaflet-popup">
                            <div className="font-outfit font-bold text-slate-800 text-center">
                                CURRENT LOCATION
                                <div className="text-xs text-slate-500 font-inter mt-1">Live Tracking Active</div>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/* Overlay to ensure corners are slightly dark-faded for cyberpunk aesthetic */}
            <div className="absolute inset-0 pointer-events-none z-[400] rounded-xl"></div>
        </div>
    );
};

export default React.memo(CobusMap);
