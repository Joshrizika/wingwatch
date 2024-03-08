"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "~/trpc/react";
import Navbar from "../_components/Navbar";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LocationSearch from "../_components/LocationSearch";

declare global {
  interface Window {
    initMap?: () => void;
  }
}
interface ILocation {
  latitude: number;
  longitude: number;
}
interface PlaceData {
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  viewport: {
    high: {
      latitude: number;
      longitude: number;
    };
    low: {
      latitude: number;
      longitude: number;
    };
  };
}

export default function Explore() {
  // Wrap the component or the specific logic that requires useSearchParams within Suspense
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);

  const removeFilters = () => {
    setSelectedPath(null);
    setSelectedAirport(null);
  };

  const pathsQuery = api.main.findPaths.useQuery();
  const airportsQuery = api.main.findAirports.useQuery();
  const [location, setLocation] = useState<ILocation | undefined>(undefined);

  const [radius, setRadius] = useState(searchParams.get("radius") ?? 30);
  const [tempRadius, setTempRadius] = useState(radius); // Temporary radius state
  const sliderRef = useRef(null); // Ref for the slider element
  const [sortOption, setSortOption] = useState(
    searchParams.get("sort") ?? "best",
  );

  // Adjust handleSliderChange to update the radius immediately
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempRadius(Number(e.target.value));
  };

  // Update radius when the user stops interacting with the slider
  const handleSliderChangeComplete = () => {
    setRadius(Number(tempRadius));
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("radius", String(tempRadius));
    window.history.pushState({}, "", "?" + urlParams.toString());
  };

  // Handle sort option change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("sort", e.target.value);
    window.history.pushState({}, "", "?" + urlParams.toString());
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
      });
    }
  }, []);

  const placesQuery = api.main.findPlaces.useQuery(
    {
      ...(selectedPath ? { pathId: selectedPath } : {}), // Only pass the parameter when it's not null
      ...(selectedAirport ? { iata_code: selectedAirport } : {}), // Only pass the parameter when it's not null
    },
    { enabled: true }, // The query will always run
  );

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    // useSearchParams().get("placeId"),
    null,
  );
  const [placeLocation, setPlaceLocation] = useState<
    PlaceData["location"] | null
  >(null);
  const [placeViewport, setPlaceViewport] = useState<
    PlaceData["viewport"] | null
  >(null);

  // useEffect(() => {
  //   const urlParams = new URLSearchParams(window.location.search);
  //   const placeId = urlParams.get("placeId");
  //   setSelectedPlaceId(placeId);
  // }, []);

  useEffect(() => {
    const placeId = searchParams.get("placeId");
    setSelectedPlaceId(placeId);
  }, [searchParams]);

  useEffect(() => {
    if (selectedPlaceId !== null) {
      fetch(`https://places.googleapis.com/v1/places/${selectedPlaceId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": "AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts",
          "X-Goog-FieldMask": "*",
        },
      })
        .then((response) => response.json())
        .then((data: PlaceData) => {
          setPlaceLocation(data.location);
          setPlaceViewport(data.viewport);
          console.log("Selected Place: ", data);
        })
        .catch((error) => {
          console.error("Error:", error);
          setPlaceLocation(null);
          setPlaceViewport(null);
        });
    } else {
      setPlaceLocation(null);
      setPlaceViewport(null);
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (selectedPlaceId) {
      urlParams.set("placeId", selectedPlaceId);
    } else {
      urlParams.delete("placeId");
    }
    window.history.replaceState({}, "", "?" + urlParams.toString());
  }, [selectedPlaceId]);

  const filteredPlacesQuery = api.main.findFilteredPlaces.useQuery({
    latitude: placeLocation
      ? placeLocation.latitude
      : location
        ? location.latitude
        : 42.3601,
    longitude: placeLocation
      ? placeLocation.longitude
      : location
        ? location.longitude
        : -71.0589,
    radius: Number(radius),
    sort: sortOption,
    pathId: selectedPath ?? undefined,
    iata_code: selectedAirport ?? undefined,
  });

  useEffect(() => {
    const center = {
      lat: location?.latitude ?? 42.3601,
      lng: location?.longitude ?? -71.0589,
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts&loading=async&callback=initMap`;
    script.async = true;
    document.body.appendChild(script);

    window.initMap = function () {
      let map: google.maps.Map | null = null;

      const mapElement = document.getElementById("map")!;

      if (mapElement) {
        if (!placeViewport) {
          // Initialize 'map' if 'placeViewport' is not available
          map = new google.maps.Map(mapElement, {
            center: center,
            zoom: 12,
          });
        } else {
          // Reinitialize 'map' if 'placeViewport' is available
          map = new google.maps.Map(mapElement);
          map.fitBounds({
            east: placeViewport.high.longitude,
            north: placeViewport.high.latitude,
            south: placeViewport.low.latitude,
            west: placeViewport.low.longitude,
          });
        }
      }

      // Your location marker
      if (location)
        new google.maps.Marker({
          position: center,
          map,
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

      // Place markers
      placesQuery.data?.forEach((place) => {
        const marker = new google.maps.Marker({
          position: { lat: place.latitude, lng: place.longitude },
          map,
          title: place.name,
        });

        // Info window for each place
        const infowindow = new google.maps.InfoWindow({
          content: `<div><h1>${place.name}</h1>
                            <p>${place.address}</p>
                            <p>Airport: ${place.airport}</p>
                            <p>Distance From Flightpath: ${place.distance_from_flightpath}</p>
                            <p>Average Altitude: ${place.average_altitude}</p>
                            <p>Distance From Airport: ${place.distance_from_airport}</p></div>`,
        });

        marker.addListener("mouseover", () => {
          infowindow.open(map, marker);
        });

        marker.addListener("mouseout", () => {
          infowindow.close();
        });
      });

      pathsQuery.data?.forEach((path) => {
        const pathPoints = path.latitude.map((lat, index) => ({
          lat,
          lng: path.longitude[index]!,
        }));

        const polyline = new google.maps.Polyline({
          path: pathPoints,
          geodesic: true,
          strokeColor: "#0000FF",
          strokeOpacity: 1.0,
          strokeWeight: 2,
          map,
        });

        polyline.addListener("click", () => {
          setSelectedPath(path.path_id);
          setSelectedAirport(null);
        });
      });

      airportsQuery.data?.forEach((airport) => {
        const marker = new google.maps.Marker({
          position: { lat: airport.latitude, lng: airport.longitude },
          map,
          title: airport.name,
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/purple-dot.png",
          },
        });

        marker.addListener("click", () => {
          setSelectedAirport(airport.iata_code);
          setSelectedPath(null);
        });

        // Info window for each airport
        const infowindow = new google.maps.InfoWindow({
          content: `<div><h1>${airport.name}</h1>
                            <p>IATA Code: ${airport.iata_code}</p>
                            <p>Elevation: ${airport.elevation}</p></div>`,
        });

        marker.addListener("mouseover", () => {
          infowindow.open(map, marker);
        });

        marker.addListener("mouseout", () => {
          infowindow.close();
        });
      });
    };

    return () => {
      document.body.removeChild(script);
      delete window.initMap;
    };
  }, [
    placesQuery.data,
    pathsQuery.data,
    location,
    airportsQuery.data,
    selectedPath,
    placeViewport,
  ]);

  return (
    <>
      <Navbar />
      <div className="mt-5 flex flex-col gap-4 px-4 md:flex-row">
        <div
          className="w-full md:w-1/3 xl:w-1/3"
          style={{ maxHeight: "80vh", minHeight: "80vh" }}
        >
          {/* Non-scrollable Header and Slider Bar */}
          <div className="mb-4">
            <h2 className="flex items-center justify-between text-xl font-bold">
              Nearby Places
              <div className="flex items-center gap-2">
                <LocationSearch
                  onSearch={(placeId) => {
                    setSelectedPlaceId(placeId);
                    if (placeId === null) {
                      setPlaceLocation(null);
                      setPlaceViewport(null);
                    }
                  }}
                  placeName={searchParams.get("placeName") ?? undefined}
                />

                <input
                  type="range"
                  min="5"
                  max="100"
                  value={tempRadius}
                  onChange={handleSliderChange}
                  onMouseUp={handleSliderChangeComplete}
                  className="w-3/4"
                  ref={sliderRef}
                />
                <span
                  style={{
                    fontWeight: "normal",
                    fontSize: 15,
                    width: "85px",
                    textAlign: "right",
                  }}
                >
                  {tempRadius} miles
                </span>
              </div>
            </h2>
            {/* Sort By Dropdown */}
            <div className="mb-4">
              <label htmlFor="sort" className="mr-2">
                Sort by:
              </label>
              <select id="sort" value={sortOption} onChange={handleSortChange}>
                <option value="best">Best</option>
                <option value="closest">Closest</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          {/* Scrollable Container for Places */}
          <div
            className="overflow-auto rounded-lg border p-4"
            style={{
              maxHeight: "75vh",
              minHeight: "75vh",
            }}
          >
            {/* Display of places */}
            {filteredPlacesQuery.data?.length ? (
              filteredPlacesQuery.data.map((place, index) => (
                <div key={index} className="mb-4 rounded border p-4">
                  <h3 className="font-semibold">{place.name}</h3>
                  {place.description && <p>Description: {place.description}</p>}
                  <p>Address: {place.address}</p>
                  <p>Airport: {place.airport}</p>
                  <p>
                    Distance from flightpath: {place.distance_from_flightpath}
                  </p>
                  <p>Average altitude: {place.average_altitude}</p>
                  <a
                    href={`/place/?id=${place.place_id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    View Details
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center">
                No places found within the selected radius.
              </div>
            )}
          </div>
        </div>

        <div
          className="relative flex-grow"
          style={{ maxHeight: "80vh", minHeight: "80vh" }}
        >
          <div
            id="map"
            className="h-full rounded-lg border"
            style={{ minHeight: "80vh" }}
          >
            {/* Map content */}
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
      </div>
    </>
  );
}
