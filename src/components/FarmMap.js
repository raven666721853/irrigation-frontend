import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";

function LocationMarker({ coords, setCoords }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      localStorage.setItem("lat", lat);
      localStorage.setItem("lon", lng);

      setCoords({ lat, lon: lng });

      console.log("📍 Selected farm:", lat, lng);
    },
  });

  return coords ? (
    <Marker position={[coords.lat, coords.lon]} />
  ) : null;
}

export default function FarmMap({ coords, setCoords }) {
  return (
    <MapContainer
      center={[coords?.lat || 34.74, coords?.lon || 10.76]}
      zoom={12}
      style={{ height: "300px", borderRadius: "12px" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationMarker coords={coords} setCoords={setCoords} />
    </MapContainer>
  );
}