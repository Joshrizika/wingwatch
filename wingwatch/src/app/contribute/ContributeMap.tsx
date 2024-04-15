import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface ILocation {
  latitude: number;
  longitude: number;
}

interface IPath {
  path_id: string;
  latitude: number[];
  longitude: number[];
}

interface IAirport {
  airport_id: string;
  name: string;
  iata_code: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
}

interface PlaceInfo {
  displayName: {
    text: string;
  };
  formattedAddress: string;
  googleMapsUri: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface MapComponentProps {
  location: ILocation | undefined;
  ipLocation: ILocation | undefined;
  paths: IPath[];
  airports: IAirport[];
  markerRef: React.MutableRefObject<google.maps.Marker | null>;
  setMarkerPosition: (position: ILocation | undefined) => void;
  place: PlaceInfo | null;
  setPlace: (place: PlaceInfo | null) => void;
  setMarkerError: (error: string) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  location,
  ipLocation,
  paths,
  airports,
  markerRef,
  setMarkerPosition,
  place,
  setPlace,
  setMarkerError,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  const locationRef = useRef<ILocation | undefined>(location);
  const locationMarkerRef = useRef<google.maps.Marker | null>(null);

  const [isMapInitialized, setIsMapInitialized] = useState(false);

  useEffect(() => {
    const initializeMap = (latitude: number, longitude: number) => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: "weekly",
        libraries: ["places"],
      });

      const mapOptions = {
        center: {
          lat: latitude,
          lng: longitude,
        },
        zoom: 12,
      };
      loader
        .importLibrary("maps")
        .then(({ Map }) => {
          const mapElement = document.getElementById("map");
          if (mapElement) {
            if (!mapRef.current) {
              mapRef.current = new Map(mapElement, mapOptions);
              setIsMapInitialized(true);

              // Add location marker if location is already set
              if (locationRef.current && !locationMarkerRef.current) {
                locationMarkerRef.current = new google.maps.Marker({
                  position: new google.maps.LatLng(
                    locationRef.current.latitude,
                    locationRef.current.longitude,
                  ),
                  map: mapRef.current,
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 7,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                  },
                  title: "You are here",
                });
              }

              mapRef.current.addListener(
                "click",
                (event: google.maps.MapMouseEvent) => {
                  if (markerRef.current) {
                    markerRef.current.setMap(null);
                    markerRef.current = null;
                  }

                  const marker = new google.maps.Marker({
                    position: event.latLng,
                    map: mapRef.current,
                  });
                  markerRef.current = marker;
                  setMarkerPosition({
                    latitude: event.latLng!.lat(),
                    longitude: event.latLng!.lng(),
                  });
                  setPlace(null);
                  setMarkerError("");
                },
              );
            }
          }
        })
        .catch((e) => {
          console.error("Failed to load the map library:", e);
        });
    };
    if (ipLocation) {
      initializeMap(Number(ipLocation.latitude), Number(ipLocation.longitude));
    }
  }, [ipLocation, markerRef, setMarkerPosition, setPlace, setMarkerError]);

  // Handle location update
  useEffect(() => {
    locationRef.current = location;
    if (mapRef.current && locationRef.current) {
      if (!locationMarkerRef.current) {
        locationMarkerRef.current = new google.maps.Marker({
          position: new google.maps.LatLng(
            locationRef.current.latitude,
            locationRef.current.longitude,
          ),
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
          },
          title: "You are here",
        });
      } else {
        locationMarkerRef.current.setPosition(
          new google.maps.LatLng(
            locationRef.current.latitude,
            locationRef.current.longitude,
          ),
        );
      }
    }
  }, [location]);

  useEffect(() => {
    // This effect handles updating the map when `place` changes
    if (place && mapRef.current) {
      const newCenter = new google.maps.LatLng(
        place.location.latitude,
        place.location.longitude,
      );
      mapRef.current.setCenter(newCenter);
      mapRef.current.setZoom(12); // Set zoom to 12 when a place is selected

      if (markerRef.current) {
        markerRef.current.setPosition(newCenter);
      } else {
        const marker = new google.maps.Marker({
          position: newCenter,
          map: mapRef.current,
        });
        markerRef.current = marker;
      }
    }
  }, [place, markerRef, setMarkerPosition, setPlace]); // Dependencies array now only contains `place`

  //Path Polylines
  useEffect(() => {
    if (isMapInitialized && mapRef.current) {
      paths.forEach((path) => {
        const pathPoints = path.latitude.map((lat, index) => ({
          lat,
          lng: path.longitude[index]!,
        }));

        new google.maps.Polyline({
          path: pathPoints,
          geodesic: true,
          strokeColor: "#0000FF",
          strokeOpacity: 1.0,
          strokeWeight: 2,
          map: mapRef.current,
        });
      });
    }
  }, [paths, isMapInitialized]);

  //Airport Markers
  useEffect(() => {
    if (isMapInitialized && mapRef.current) {
      airports.forEach((airport) => {
        const marker = new google.maps.Marker({
          position: { lat: airport.latitude, lng: airport.longitude },
          map: mapRef.current,
          title: airport.name,
          icon: {
            url: "./AirportIcon.png",
            scaledSize: new google.maps.Size(35, 50),
          },
        });

        // Info window for each airport
        const infowindow = new google.maps.InfoWindow({
          content: `<div><h1>${airport.name}</h1>
                                      <p>IATA Code: ${airport.iata_code}</p>
                                      <p>Elevation: ${airport.elevation}</p></div>`,
        });

        marker.addListener("mouseover", () => {
          infowindow.open(mapRef.current, marker);
        });

        marker.addListener("mouseout", () => {
          infowindow.close();
        });
      });
    }
  }, [airports, isMapInitialized]);

  return (
    <div
      className="relative flex-grow"
      style={{ maxHeight: "80vh", minHeight: "80vh" }}
    >
      <div
        id="map"
        className="h-full rounded-lg border"
        style={{
          height: "50vh",
          width: "70vh",
          border: "1px solid #ccc",
          borderRadius: "5px",
        }}
      ></div>
    </div>
  );
};

export default MapComponent;
