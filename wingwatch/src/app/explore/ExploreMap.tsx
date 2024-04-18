import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "@googlemaps/js-api-loader";

interface ILocation {
  latitude: number;
  longitude: number;
}
interface IPlace {
  place_id: string;
  name: string;
  address: string;
  description: string | null;
  latitude: number;
  longitude: number;
  path_id: string | null;
  google_maps_uri: string | null;
  airport: string | null;
  airportDetails: {
    name: string;
    iata_code: string;
    latitude: number;
    longitude: number;
    elevation: number | null;
  } | null;
  distance_from_flightpath: number | null;
  average_altitude: number;
  altitude_estimated: boolean;
  distance_from_airport: number | null;
  isUserSubmitted: boolean;
  submittedUserId: string | null;
  isVerified: boolean;
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

interface MapComponentProps {
  location: ILocation | undefined;
  ipLocation: ILocation | undefined;
  searchOriginLocation: ILocation | null;
  radius: number;
  places: IPlace[];
  hoveredPlace: string | null;
  sliderToggled: boolean;
  paths: IPath[];
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  airports: IAirport[];
  selectedAirport: string | null;
  setSelectedAirport: (airport: string | null) => void;
  removeFilters: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  location,
  ipLocation,
  searchOriginLocation,
  radius,
  places,
  sliderToggled,
  hoveredPlace,
  paths,
  selectedPath,
  setSelectedPath,
  airports,
  selectedAirport,
  setSelectedAirport,
  removeFilters,
}) => {
  const router = useRouter();

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
        minZoom: 2,
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

              // Add searchOriginLocation marker if searchOriginLocation is already set
              if (
                searchOriginLocationRef.current &&
                !searchOriginLocationMarkerRef.current
              ) {
                searchOriginLocationMarkerRef.current = new google.maps.Marker({
                  position: {
                    lat: searchOriginLocationRef.current.latitude,
                    lng: searchOriginLocationRef.current.longitude,
                  },
                  map: mapRef.current,
                  icon: {
                    url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  },
                  title: "Search Origin",
                });
                //set the map center to this location
                mapRef.current.setCenter({
                  lat: searchOriginLocationRef.current.latitude,
                  lng: searchOriginLocationRef.current.longitude,
                });
              }
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
  }, [ipLocation]);

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

  const searchOriginLocationRef = useRef<ILocation | null>(
    searchOriginLocation,
  );
  const searchOriginLocationMarkerRef = useRef<google.maps.Marker | null>(null);

  // Handle searchOriginLocation update
  useEffect(() => {
    searchOriginLocationRef.current = searchOriginLocation;
    if (mapRef.current) {
      if (searchOriginLocation) {
        if (!searchOriginLocationMarkerRef.current) {
          searchOriginLocationMarkerRef.current = new google.maps.Marker({
            position: new google.maps.LatLng(
              searchOriginLocation.latitude,
              searchOriginLocation.longitude,
            ),
            map: mapRef.current,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            },
            title: "Search Origin",
          });
          // Center the map on the new marker
          mapRef.current.setCenter({
            lat: searchOriginLocation.latitude,
            lng: searchOriginLocation.longitude,
          });
          mapRef.current.setZoom(12);
        } else {
          searchOriginLocationMarkerRef.current.setPosition(
            new google.maps.LatLng(
              searchOriginLocation.latitude,
              searchOriginLocation.longitude,
            ),
          );
          // Center the map on the updated marker position
          mapRef.current.setCenter({
            lat: searchOriginLocation.latitude,
            lng: searchOriginLocation.longitude,
          });
          mapRef.current.setZoom(12);
        }
      } else if (searchOriginLocationMarkerRef.current) {
        // Remove the marker if searchOriginLocation is null
        searchOriginLocationMarkerRef.current.setMap(null);
        searchOriginLocationMarkerRef.current = null;
        if (locationRef.current) {
          mapRef.current.setCenter({
            lat: locationRef.current.latitude,
            lng: locationRef.current.longitude,
          });
        }
      }
    }
  }, [searchOriginLocation]);

  //Radius Circle
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (mapRef.current) {
      const center = {
        lat: searchOriginLocation?.latitude ?? location?.latitude ?? 0,
        lng: searchOriginLocation?.longitude ?? location?.longitude ?? 0,
      };

      if (!circleRef.current) {
        circleRef.current = new google.maps.Circle({
          strokeColor: "#0000FF",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#0000FF",
          fillOpacity: 0.35,
          map: mapRef.current,
          center: center,
          radius: Number(radius) * 1609.34,
          visible: true,
        });
      } else {
        circleRef.current.setCenter(center);
        circleRef.current.setRadius(Number(radius) * 1609.34);
      }

      if (sliderToggled) {
        circleRef.current.setVisible(true);
      } else {
        circleRef.current.setVisible(false);
      }
    }
  }, [radius, searchOriginLocation, location, sliderToggled]);

  // Places Markers
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const markersListenersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (mapRef.current && isMapInitialized) {
      places.forEach((place) => {
        let shouldDisplayMarker = true;
        if (selectedPath && place.path_id !== selectedPath) {
          shouldDisplayMarker = false;
        }
        if (selectedAirport && place.airport !== selectedAirport) {
          shouldDisplayMarker = false;
        }

        let marker = markersRef.current.get(place.place_id);
        if (shouldDisplayMarker) {
          if (!marker) {
            marker = new google.maps.Marker({
              position: { lat: place.latitude, lng: place.longitude },
              map: mapRef.current,
              title: place.name,
              visible: true, // Ensure marker is visible upon creation
              icon: {
                url: "./PlaceIcon.png",
                scaledSize: new google.maps.Size(28, 40),
              },
            });
            markersRef.current.set(place.place_id, marker);
          } else {
            marker.setVisible(true); // Ensure marker is visible if it was previously hidden
          }

          if (!markersListenersRef.current.has(place.place_id)) {
            const infowindow = new google.maps.InfoWindow({
              content: `
                <style>
                  .no-select {
                    user-select: none;
                    -moz-user-select: none;
                    -webkit-user-select: none;
                    -ms-user-select: none;
                  }
                </style>
                <div class="no-select">
                  <h1><strong>${place.name}</strong></h1>
                  <p>${place.address}</p>
                  <p>Airport: ${place.airportDetails?.name} (${place.airportDetails?.iata_code})</p>
                  ${place.distance_from_flightpath !== null ? `<p>Distance From Flightpath: ${(Math.round(place.distance_from_flightpath * 100) / 100).toFixed(2)} ${Math.round(place.distance_from_flightpath * 100) / 100 === 1 ? "mile" : "miles"}</p>` : ""}
                  <p>Average Altitude: ${Math.round(place.average_altitude)} ${Math.round(place.average_altitude) === 1 ? "foot" : "feet"}</p>
                  ${place.distance_from_airport !== null ? `<p>Distance From Airport: ${(Math.round(place.distance_from_airport * 100) / 100).toFixed(2)} ${Math.round(place.distance_from_airport * 100) / 100 === 1 ? "mile" : "miles"}</p>` : ""}
                  <p>*Click to view page</p>
                </div>
              `,
            });

            marker.addListener("mouseover", () => {
              infowindow.open(mapRef.current, marker);
            });
            marker.addListener("mouseout", () => {
              infowindow.close();
            });
            marker.addListener("click", () => {
              router.push(`/place?id=${place.place_id}`);
            });

            markersListenersRef.current.add(place.place_id);
          }

          // Adjust icon size based on hoveredPlace
          if (hoveredPlace === place.place_id) {
            marker.setIcon({
              url: "./PlaceIcon.png",
              scaledSize: new google.maps.Size(42, 60),
            });
          } else {
            marker.setIcon({
              url: "./PlaceIcon.png",
              scaledSize: new google.maps.Size(28, 40),
            });
          }
        } else {
          if (marker) {
            marker.setVisible(false); // Hide marker if it does not match the filter criteria
          }
        }
      });
    }
  }, [
    places,
    router,
    hoveredPlace,
    selectedPath,
    selectedAirport,
    isMapInitialized,
  ]);

  //Path Polylines
  useEffect(() => {
    if (isMapInitialized && mapRef.current) {
      paths.forEach((path) => {
        const pathPoints = path.latitude.map((lat, index) => ({
          lat,
          lng: path.longitude[index]!,
        }));

        const polyline = new google.maps.Polyline({
          path: pathPoints,
          geodesic: true,
          strokeColor: "#34baeb",
          strokeOpacity: 0.8,
          strokeWeight: 5,
          map: mapRef.current,
        });

        polyline.addListener("click", () => {
          setSelectedPath(path.path_id);
          setSelectedAirport(null);
        });
      });
    }
  }, [paths, isMapInitialized, setSelectedPath, setSelectedAirport]);

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

        marker.addListener("click", () => {
          setSelectedAirport(airport.iata_code);
          setSelectedPath(null);
        });

        // Info window for each airport
        const infowindow = new google.maps.InfoWindow({
          content: `
        <style>
          .no-select {
            user-select: none;
            -moz-user-select: none;
            -webkit-user-select: none;
            -ms-user-select: none;
          }
        </style>
        <div class="no-select">
          <h1><strong>${airport.name}</strong></h1>
          <p>IATA Code: ${airport.iata_code}</p>
          ${airport.elevation ? `<p>Elevation: ${airport.elevation}</p>` : ""}
          <p>*Click to filter results</p>
        </div>
      `,
        });

        marker.addListener("mouseover", () => {
          infowindow.open(mapRef.current, marker);
        });

        marker.addListener("mouseout", () => {
          infowindow.close();
        });
      });
    }
  }, [airports, isMapInitialized, setSelectedPath, setSelectedAirport]);

  return (
    <div
      className="relative flex-grow"
      style={{ maxHeight: "85.5vh", minHeight: "85.5vh" }}
    >
      <div
        id="map"
        className="h-full rounded-lg border"
        style={{ minHeight: "80vh" }}
      ></div>
      <div className="text-right text-sm text-gray-500">
        <p>*Click on an airport or path to filter results</p>
      </div>

      {(selectedPath ?? selectedAirport) && (
        <div className="absolute bottom-0 left-0 z-10 m-2 max-w-xs rounded bg-white p-4 shadow-lg">
          <div className="flex flex-col">
            <div className="absolute right-0 top-0">
              <button
                onClick={removeFilters}
                className="text-black hover:text-gray-700"
              >
                x
              </button>
            </div>
            <div>
              {selectedPath && `Selected Flightpath: ${selectedPath}`}
              {selectedAirport && `Selected Airport: ${selectedAirport}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
