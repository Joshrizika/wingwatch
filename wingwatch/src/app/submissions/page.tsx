"use client";

import Navbar from "../_components/Navbar";
import { api } from "~/trpc/react";
import React, { useState, useEffect } from "react";
import Loading from "../_components/Loading";
import { Loader } from "@googlemaps/js-api-loader";

interface Place {
  place_id: string;
  name: string;
  address: string;
  description: string | null;
  latitude: number;
  longitude: number;
  path_id: string | null;
  path: {
    latitude: number[];
    longitude: number[];
  } | null;
  google_maps_uri: string | null;
  airport: string | null;
  distance_from_flightpath: number | null;
  altitude_estimated: boolean;
  average_altitude: number;
  distance_from_airport: number | null;
  isUserSubmitted: boolean;
  submittedUser: {
    id: string;
    name: string;
    email: string;
    emailVerified: Date | null;
    image: string | null;
    isAdmin: boolean;
  } | null;
  airportDetails: {
    airport_id: string;
    name: string;
    iata_code: string;
    latitude: number;
    longitude: number;
    elevation: number | null;
  } | null;
}

export default function Submissions() {
  const { data: session, isLoading: sessionLoading } =
    api.main.getSession.useQuery();
  const submittedPlacesQuery = api.main.findSubmittedPlaces.useQuery();

  const pathsQuery = api.main.findPaths.useQuery();
  const airportsQuery = api.main.findAirports.useQuery();

  const approvePlaceMutation = api.main.approvePlace.useMutation();
  const rejectPlaceMutation = api.main.rejectPlace.useMutation();
  const updatePlaceMutation = api.main.updatePlace.useMutation();

  const [popUpOpen, setPopUpOpen] = useState(false);
  const [popUpPlace, setPopUpPlace] = useState<Place | null>(null);
  const [submittedAltitude, setSubmittedAltitude] = useState<number | null>(
    null,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [iataError, setIataError] = useState<string | null>(null);

  const handleApprove = async (placeId: string) => {
    await approvePlaceMutation.mutateAsync({ placeId });
    void submittedPlacesQuery.refetch();
  };

  const handleReject = async (placeId: string) => {
    await rejectPlaceMutation.mutateAsync({ placeId });
    void submittedPlacesQuery.refetch();
  };

  const updatePlace = async () => {
    if (popUpPlace) {
      try {
        if (!popUpPlace.name) {
          setNameError("Name is required");
          return;
        }
        if (popUpPlace.path_id && popUpPlace.airport) {
          if (popUpPlace.path_id.slice(0, 3) !== popUpPlace.airport) {
            setPathError(`Path ID and IATA Code do not match`);
            return;
          }
        }

        await updatePlaceMutation.mutateAsync({
          placeId: popUpPlace.place_id,
          name: popUpPlace.name,
          address: popUpPlace.address,
          description: popUpPlace.description ? popUpPlace.description : null,
          pathId: popUpPlace.path_id ? popUpPlace.path_id : null,
          googleMapsURI: popUpPlace.google_maps_uri
            ? popUpPlace.google_maps_uri
            : null,
          iataCode: popUpPlace.airport ? popUpPlace.airport : null,
          distanceFromFlightpath: popUpPlace.distance_from_flightpath
            ? popUpPlace.distance_from_flightpath
            : null,
          averageAltitude: popUpPlace.average_altitude,
          altitudeEstimated:
            popUpPlace.average_altitude !== submittedAltitude ? true : false,
          distanceFromAirport: popUpPlace.distance_from_airport
            ? popUpPlace.distance_from_airport
            : null,
        });
        void submittedPlacesQuery.refetch();
        setPopUpOpen(false);
        setIsMapInitialized(false);
        setPopUpPlace(null);
        setSubmittedAltitude(null);
        setNameError(null);
        setPathError(null);
        setIataError(null);
      } catch (error) {
        setNameError(null);
        setPathError(null);
        setIataError(null);
        if (
          error instanceof Error &&
          error.message.includes("places_path_id_fkey")
        ) {
          setPathError("Please enter a valid Path ID");
        }
        if (
          error instanceof Error &&
          error.message.includes("places_airport_fkey")
        ) {
          setIataError("Please enter a valid IATA Code");
        }
      }
    }
  };

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
          if (mapElement && !isMapInitialized) {
            const map = new Map(mapElement, mapOptions);

            // Add markers to the map based on the places
            new google.maps.Marker({
              map: map,
              position: {
                lat: popUpPlace?.latitude ?? 0,
                lng: popUpPlace?.longitude ?? 0,
              },
              title: popUpPlace?.name,
            });

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
                map: map,
              });
            });

            airportsQuery.data?.forEach((airport) => {
              new google.maps.Marker({
                position: { lat: airport.latitude, lng: airport.longitude },
                map: map,
                title: airport.name,
                icon: {
                  url: "./AirportIcon.png",
                  scaledSize: new google.maps.Size(35, 50), // back to normal size
                },
              });
            });
            setIsMapInitialized(true);
          }
        })
        .catch((e) => {
          console.error("Failed to load the map library:", e);
        });
    };

    if (popUpPlace) {
      initializeMap(
        Number(popUpPlace?.latitude),
        Number(popUpPlace?.longitude),
      );
    }
  }, [popUpPlace, pathsQuery, airportsQuery, isMapInitialized]);

  if (sessionLoading || submittedPlacesQuery.isLoading) {
    return <Loading />;
  }

  if (!session?.user?.isAdmin) {
    return <div>Invalid Access</div>;
  }

  return (
    <>
      <Navbar />
      <div className="mt-10 flex flex-col items-center">
        <h1 className="mb-5 text-4xl font-bold">Submissions</h1>
      </div>
      <div
        className="overflow-auto p-4 pt-0"
        style={{ maxHeight: "calc(100vh - 64px)" }}
      >
        <div className="space-y-4">
          {submittedPlacesQuery.data?.map((place) => (
            <div
              key={place.place_id}
              className="flex items-center justify-between border p-4"
            >
              <div>
                <h3 className="font-semibold">{place.name}</h3>
                {place.description && <p>Description: {place.description}</p>}
                <p>Address: {place.address}</p>
                {place.airport && <p>Airport: {place.airportDetails?.name}</p>}
                {place.distance_from_flightpath && (
                  <p>
                    Distance from Flight Path:{" "}
                    {Math.round(place.distance_from_flightpath * 100) / 100}{" "}
                    {Math.round(place.distance_from_flightpath * 100) / 100 ===
                    1
                      ? "mile"
                      : "miles"}
                  </p>
                )}
                <p>
                  Average Altitude: {place.altitude_estimated && "~"}
                  {Math.round(place.average_altitude)}{" "}
                  {Math.round(place.average_altitude) === 1 ? "foot" : "feet"}
                </p>
                {place.isUserSubmitted && (
                  <p>Submitted By: {place.submittedUser?.name}</p>
                )}
                <button
                  className="mt-2 rounded bg-blue-500 px-4 py-2 text-white"
                  onClick={() => {
                    setPopUpOpen(true);
                    setPopUpPlace(place);
                    setSubmittedAltitude(place.average_altitude);
                  }}
                >
                  View and make edits
                </button>
              </div>
              <div className="flex flex-col">
                <button
                  className="mb-2 rounded bg-green-500 px-4 py-2 text-white"
                  onClick={() => handleApprove(place.place_id)}
                >
                  Approve
                </button>
                <button
                  className="rounded bg-red-500 px-4 py-2 text-white"
                  onClick={() => handleReject(place.place_id)}
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {popUpOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "5px",
              position: "relative",
            }}
          >
            <button
              onClick={() => {
                setPopUpOpen(false);
                setIsMapInitialized(false);
                setPopUpPlace(null);
                setSubmittedAltitude(null);
                setNameError(null);
                setPathError(null);
                setIataError(null);
              }}
              style={{
                position: "absolute",
                right: "10px",
                top: "10px",
                border: "none",
                background: "transparent",
                fontSize: "1.5em",
              }}
            >
              &times;
            </button>
            <h2 className="text-center font-bold">Submission Details</h2>
            {popUpPlace && (
              <>
                <div
                  style={{ display: "flex", flexDirection: "row", gap: "40px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: "1",
                    }}
                  >
                    <label>Name:</label>
                    <input
                      type="text"
                      value={popUpPlace.name}
                      onChange={(e) =>
                        setPopUpPlace({ ...popUpPlace, name: e.target.value })
                      }
                      style={{
                        border: "1px solid #ddd",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                    {nameError && <p style={{ color: "red" }}>{nameError}</p>}
                    <label>Address:</label>
                    <input
                      type="text"
                      value={popUpPlace.address}
                      onChange={(e) =>
                        setPopUpPlace({
                          ...popUpPlace,
                          address: e.target.value,
                        })
                      }
                      style={{
                        border: "1px solid #ddd",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                    <label>Description:</label>
                    <textarea
                      value={popUpPlace.description ?? ""}
                      onChange={(e) =>
                        setPopUpPlace({
                          ...popUpPlace,
                          description: e.target.value,
                        })
                      }
                      style={{
                        border: "1px solid #ddd",
                        height: "100px",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                    <p>Coordinates:</p>
                    <p>
                      {popUpPlace.latitude}, {popUpPlace.longitude}
                    </p>
                    <label>Path ID:</label>
                    <input
                      type="text"
                      value={popUpPlace.path_id ?? ""}
                      onChange={(e) =>
                        setPopUpPlace({
                          ...popUpPlace,
                          path_id: e.target.value ?? null,
                        })
                      }
                      style={{
                        border: "1px solid #ddd",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                    {pathError && <p style={{ color: "red" }}>{pathError}</p>}
                    <label>Google Maps URI:</label>
                    <input
                      type="text"
                      value={popUpPlace.google_maps_uri ?? ""}
                      onChange={(e) =>
                        setPopUpPlace({
                          ...popUpPlace,
                          google_maps_uri: e.target.value,
                        })
                      }
                      style={{
                        border: "1px solid #ddd",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                    <label>IATA Code:</label>
                    <input
                      type="text"
                      value={popUpPlace.airport ?? ""}
                      onChange={(e) =>
                        setPopUpPlace({
                          ...popUpPlace,
                          airport: e.target.value,
                        })
                      }
                      style={{
                        border: "1px solid #ddd",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                    {iataError && <p style={{ color: "red" }}>{iataError}</p>}
                    <label>Distance from Flightpath:</label>
                    <input
                      type="number"
                      value={popUpPlace.distance_from_flightpath ?? ""}
                      onChange={(e) =>
                        setPopUpPlace({
                          ...popUpPlace,
                          distance_from_flightpath: parseFloat(e.target.value),
                        })
                      }
                      style={{
                        border: "1px solid #ddd",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                    <label>Average Altitude:</label>
                    <input
                      type="number"
                      min="0"
                      value={popUpPlace.average_altitude ?? ""}
                      placeholder="Estimate the altitude"
                      onChange={(e) =>
                        setPopUpPlace({
                          ...popUpPlace,
                          average_altitude: parseFloat(e.target.value),
                        })
                      }
                      style={{
                        border: "1px solid #ddd",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                    <label>Distance from Airport:</label>
                    <input
                      type="number"
                      value={popUpPlace.distance_from_airport ?? ""}
                      onChange={(e) =>
                        setPopUpPlace({
                          ...popUpPlace,
                          distance_from_airport: parseFloat(e.target.value),
                        })
                      }
                      style={{
                        border: "1px solid #ddd",
                        width: "100%",
                        minWidth: "400px",
                      }}
                    />
                  </div>
                  <div
                    className="w-full md:w-1/2"
                    style={{ height: "600px", width: "600px" }}
                    id="map"
                  ></div>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={updatePlace}
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      padding: "5px",
                      marginTop: "5px",
                      backgroundColor: "#0000FF",
                      color: "white",
                      width: "15%",
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
