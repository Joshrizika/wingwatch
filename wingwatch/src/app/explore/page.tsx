"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "~/trpc/react";
import Navbar from "../_components/Navbar";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ExploreLocationSearch from "./ExploreLocationSearch";
import Link from "next/link";
import Loading from "../_components/Loading";
import MapComponent from "./ExploreMap";

declare global {
  interface Window {
    initMap?: () => void;
  }
}
interface ILocation {
  latitude: number;
  longitude: number;
}
interface SearchOriginData {
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function Explore() {
  return (
    <Suspense fallback={<Loading />}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();

  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);

  const removeFilters = () => {
    setSelectedPath(null);
    setSelectedAirport(null);
  };

  const [radius, setRadius] = useState(searchParams.get("radius") ?? 30);
  const [tempRadius, setTempRadius] = useState(radius); // Temporary radius state
  const sliderRef = useRef<HTMLInputElement | null>(null); // Ref for the slider element
  const [sliderToggled, setSliderToggled] = useState(false); // State to track if the slider is being interacted with

  // Adjust handleSliderChange to update the radius immediately
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempRadius(Number(e.target.value));
  };

  // Update radius when the user stops interacting with the slider
  const handleSliderChangeComplete = () => {
    setRadius(Number(tempRadius));
    setSliderToggled(false);
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("radius", String(Math.round(Number(tempRadius))));
    window.history.pushState({}, "", "?" + urlParams.toString());
  };

  const [sortOption, setSortOption] = useState(
    searchParams.get("sort") ?? "best",
  );

  // Handle sort option change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("sort", e.target.value);
    window.history.pushState({}, "", "?" + urlParams.toString());
  };

  const [location, setLocation] = useState<ILocation | undefined>(undefined);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation Error:", error);
        },
        {
          enableHighAccuracy: false,
          maximumAge: Infinity,
        },
      );
    }
  }, []);

  const [ipLocation, setIpLocation] = useState<ILocation | undefined>(
    undefined,
  );

  useEffect(() => {
    fetch("https://get.geojs.io/v1/ip/geo.json")
      .then((response) => response.json())
      .then((data: ILocation) => {
        setIpLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        setIpLocation({
          latitude: 42.360081,
          longitude: -71.058884,
        });
      });
  }, []);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searchOriginLocation, setSearchOriginLocation] = useState<
    SearchOriginData["location"] | null
  >(null);

  useEffect(() => {
    const placeId = searchParams.get("placeId");
    setSelectedPlaceId(placeId);
  }, [searchParams]);

  useEffect(() => {
    if (selectedPlaceId !== null) {
      fetch(`https://places.googleapis.com/v1/places/${selectedPlaceId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask": "location",
        },
      })
        .then((response) => response.json())
        .then((data: SearchOriginData) => {
          setSearchOriginLocation(data.location);
        })
        .catch((error) => {
          console.error("Error:", error);
          setSearchOriginLocation(null);
        });
    } else {
      setSearchOriginLocation(null);
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (selectedPlaceId) {
      urlParams.set("placeId", selectedPlaceId);
    }
    window.history.replaceState({}, "", "?" + urlParams.toString());
  }, [selectedPlaceId]);

  const filteredPlacesQuery = api.main.findFilteredPlaces.useQuery({
    latitude: searchOriginLocation
      ? searchOriginLocation.latitude
      : location
        ? location.latitude
        : 0,
    longitude: searchOriginLocation
      ? searchOriginLocation.longitude
      : location
        ? location.longitude
        : 0,
    radius: Number(radius),
    sort: sortOption,
    pathId: selectedPath ?? undefined,
    iata_code: selectedAirport ?? undefined,
  });

  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 3958.8; // Earth radius in miles
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    lat1 = toRadians(lat1);
    lat2 = toRadians(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Convert degree to radians
  function toRadians(degree: number): number {
    return degree * (Math.PI / 180);
  }

  const [pageIsLoading, setPageIsLoading] = useState(true);

  const placesQuery = api.main.findPlaces.useQuery();
  const pathsQuery = api.main.findPaths.useQuery();
  const airportsQuery = api.main.findAirports.useQuery();

  useEffect(() => {
    if (
      pathsQuery.isLoading ||
      airportsQuery.isLoading ||
      placesQuery.isLoading ||
      !ipLocation
    ) {
      setPageIsLoading(true);
    } else {
      setPageIsLoading(false);
    }
  }, [
    pathsQuery.isLoading,
    airportsQuery.isLoading,
    placesQuery.isLoading,
    ipLocation,
    setPageIsLoading,
  ]);

  if (pageIsLoading) {
    return <Loading />;
  }

  return (
    <>
      <Navbar />
      <div className="mt-5 flex flex-col gap-4 px-4 md:flex-row">
        <div className="w-full md:w-1/3 xl:w-1/3" style={{ minWidth: "490px" }}>
          {/* Non-scrollable Header and Slider Bar */}
          <div className="mb-4 flex flex-row items-start gap-4">
            <div className="flex flex-col">
              <h2 className="whitespace-nowrap text-xl font-bold">
                Nearby Places
              </h2>
              {/* Sort By Dropdown */}
              <div className="mt-4" style={{ minWidth: "150px" }}>
                <label htmlFor="sort" className="mr-2">
                  Sort by:
                </label>
                <select
                  id="sort"
                  value={sortOption}
                  onChange={handleSortChange}
                  style={{ outline: "1px solid gray", borderRadius: "4px" }}
                >
                  <option value="best">Best</option>
                  <option value="closest">Closest</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>

            <div className="flex-grow">
              <ExploreLocationSearch
                onSearch={(placeId) => {
                  setSelectedPlaceId(placeId);
                  if (placeId === null) {
                    setSearchOriginLocation(null);
                  }
                }}
                placeName={searchParams.get("placeName") ?? undefined}
              />
            </div>

            <div
              className="flex flex-col justify-center"
              style={{ minWidth: "160px", height: "100%", paddingTop: "5px" }}
            >
              {/* Title for the slider centered */}
              <div style={{ textAlign: "center", marginBottom: "5px" }}>
                <span
                  style={{
                    // fontWeight: "bold",
                    fontSize: "16px",
                  }}
                >
                  Radius
                </span>
              </div>

              {/* Container for the slider centered */}
              <div className="flex items-center justify-center">
                <input
                  type="range"
                  min="1"
                  max="100"
                  step=".1"
                  value={tempRadius}
                  onMouseDown={() => setSliderToggled(true)}
                  onChange={handleSliderChange}
                  onMouseUp={handleSliderChangeComplete}
                  className="w-full"
                  ref={sliderRef}
                />
              </div>

              {/* Centered container for the span below the slider */}
              <div style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontWeight: "normal",
                    fontSize: "15px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {Math.round(Number(tempRadius))}{" "}
                  {Math.round(Number(tempRadius)) > 1 ? "miles" : "mile"}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Container for Places */}
          {filteredPlacesQuery.isLoading ? (
            <div style={{ marginTop: "-150px" }}>
              <Loading />
            </div>
          ) : (
            <div
              className="overflow-auto rounded-lg border p-4"
              style={{
                maxHeight: "75vh",
                minHeight: "75vh",
              }}
            >
              {/* Display of places */}
              {location ?? searchOriginLocation ? (
                filteredPlacesQuery.data?.length ? (
                  filteredPlacesQuery.data.map((place, index) => (
                    <div
                      key={index}
                      className="mb-4 rounded border p-4"
                      id={`place-${place.place_id}`}
                      onMouseEnter={() => setHoveredPlace(place.place_id)}
                      onMouseLeave={() => setHoveredPlace(null)}
                    >
                      <div className="flex items-center">
                        <h3 className="font-semibold">{place.name}</h3>
                        {place.isUserSubmitted && (
                          <span className="ml-2 rounded bg-yellow-200 px-2 py-1 text-yellow-500">
                            User Recommended
                          </span>
                        )}
                      </div>
                      {place.description && (
                        <p>Description: {place.description}</p>
                      )}
                      <p>Address: {place.address}</p>
                      {place.airport && (
                        <p>
                          Airport: {place.airportDetails?.name} (
                          {place.airportDetails?.iata_code})
                        </p>
                      )}
                      {place.distance_from_flightpath && (
                        <p>
                          Distance from Flight Path:{" "}
                          {Math.round(place.distance_from_flightpath * 100) /
                            100}{" "}
                          {Math.round(place.distance_from_flightpath * 100) /
                            100 ===
                          1
                            ? "mile"
                            : "miles"}
                        </p>
                      )}
                      <p>
                        Average Altitude: {place.altitude_estimated && "~"}
                        {Math.round(place.average_altitude)}{" "}
                        {Math.round(place.average_altitude) === 1
                          ? "foot"
                          : "feet"}
                      </p>
                      <p>
                        Distance:{" "}
                        {(() => {
                          const originLat = searchOriginLocation
                            ? searchOriginLocation.latitude
                            : location!.latitude;
                          const originLon = searchOriginLocation
                            ? searchOriginLocation.longitude
                            : location!.longitude;
                          const distance = calculateDistance(
                            originLat,
                            originLon,
                            place.latitude,
                            place.longitude,
                          );
                          return `${distance.toFixed(2)} ${distance.toFixed(2) === "1" ? "mile" : "miles"}`;
                        })()}
                      </p>
                      <Link href={`/place/?id=${place.place_id}`}>
                        <span className="cursor-pointer text-blue-500 hover:text-blue-700">
                          View Details
                        </span>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-center">
                    No places found within the selected radius.
                  </div>
                )
              ) : (
                <div className="text-center">Finding your location...</div>
              )}
            </div>
          )}
        </div>
        <MapComponent
          location={location}
          ipLocation={ipLocation}
          searchOriginLocation={searchOriginLocation}
          radius={Number(tempRadius)}
          sliderToggled={sliderToggled}
          places={placesQuery.data ?? []}
          hoveredPlace={hoveredPlace}
          paths={pathsQuery.data ?? []}
          selectedPath={selectedPath}
          setSelectedPath={setSelectedPath}
          airports={airportsQuery.data ?? []}
          selectedAirport={selectedAirport}
          setSelectedAirport={setSelectedAirport}
          removeFilters={removeFilters}
        />
      </div>
    </>
  );
}
