"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "~/trpc/react";
import Navbar from "../_components/Navbar";

declare global {
  interface Window {
    initMap?: () => void;
  }
}

interface ILocation {
  latitude: number;
  longitude: number;
}

export default function Explore() {
  const placesQuery = api.main.findPlaces.useQuery();
  const pathsQuery = api.main.findPaths.useQuery();
  const [location, setLocation] = useState<ILocation | undefined>(undefined);
  const [radius, setRadius] = useState(30);
  const [tempRadius, setTempRadius] = useState(radius); // Temporary radius state
  const sliderRef = useRef(null); // Ref for the slider element
  const [sortOption, setSortOption] = useState("best");

  // Adjust handleSliderChange to update the radius immediately
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempRadius(Number(e.target.value));
  };

  // Update radius when the user stops interacting with the slider
  const handleSliderChangeComplete = () => {
    setRadius(tempRadius);
  };

  // Handle sort option change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
      });
    }
  }, []);

  const filteredPlacesQuery = api.main.findFilteredPlaces.useQuery(
    {
      latitude: location ? location.latitude : 0,
      longitude: location ? location.longitude : 0,
      radius: radius,
      sort: sortOption,
    },
    {
      enabled: !!location,
    },
  );

  useEffect(() => {
    if (!location) return;
    const center = {
      lat: location?.latitude ?? 0,
      lng: location?.longitude ?? 0,
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts&loading=async&callback=initMap`;
    script.async = true;
    document.body.appendChild(script);

    window.initMap = function () {
      const map = new google.maps.Map(document.getElementById("map")!, {
        center,
        zoom: 12,
      });

      // Your location marker
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

        marker.addListener("click", () => {
          infowindow.open(map, marker);
        });
      });

      // Path Polylines
      pathsQuery.data?.forEach((path) => {
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
          map,
        });
      });
    };

    return () => {
      document.body.removeChild(script);
      delete window.initMap;
    };
  }, [placesQuery.data, pathsQuery.data, location]);

  return (
    <>
      <Navbar />
      <div className="mt-5 flex flex-col gap-4 px-4 md:flex-row">
        <div
          className="w-full md:w-1/3 xl:w-1/3"
          style={{ maxHeight: "80vh", minHeight: "80vh" }} // Updated to set both max and min height to 80vh
        >
          {/* Non-scrollable Header and Slider Bar */}
          <div className="mb-4">
            <h2 className="flex items-center justify-between text-xl font-bold">
              Nearby Places
              <div className="flex items-center gap-2">
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
              <label htmlFor="sort" className="mr-2">Sort by:</label>
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
              maxHeight: "75vh", // Updated to set max height to 80vh
              minHeight: "75vh", // Updated to set min height to 80vh
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
          className="flex-grow"
          style={{ maxHeight: "80vh", minHeight: "80vh" }} // Updated to set both max and min height to 80vh
        >
          <div
            id="map"
            className="h-full rounded-lg border"
            style={{ minHeight: "80vh" }} // Updated to set min height to 80vh
          ></div>
        </div>
      </div>
    </>
  );
}
