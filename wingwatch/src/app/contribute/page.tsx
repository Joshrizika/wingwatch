"use client";

import React, { useEffect, useState, useRef } from "react";
import Navbar from "../_components/Navbar";
import { api } from "~/trpc/react";
import ContributeLocationSearch from "../_components/ContributeLocationSearch";
import Loading from "../_components/Loading";
import MapComponent from "../_components/ContributeMap";

interface ILocation {
  latitude: number;
  longitude: number;
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

interface NewPlace {
  name: string;
  address: string;
  description: string;
  latitude: number | undefined;
  longitude: number | undefined;
  pathId: string | null;
  googleMapsUri: string | null;
  iataCode: string | null;
  distanceFromFlightpath: number | null;
  averageAltitude: number | null;
  distanceFromAirport: number | null;
  userId: string | null;
}

export default function Contribute() {
  const session = api.main.getSession.useQuery().data;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [markerPosition, setMarkerPosition] = useState<ILocation | undefined>(
    undefined,
  );
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [nameError, setNameError] = useState("");
  const [markerError, setMarkerError] = useState("");
  const [nearbyPlaceError, setNearbyPlaceError] = useState("");
  const [altitudeError, setAltitudeError] = useState("");

  const [popUpOpen, setPopUpOpen] = useState(false);
  const [newPlace, setNewPlace] = useState<NewPlace | null>(null);
  const [averageAltitude, setAverageAltitude] = useState<number | null>(null);

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
      });
  }, []);

  useEffect(() => {
    if (place) {
      setName(place.displayName.text);
      setMarkerPosition(place.location);
    } else {
      setName("");
    }
    setNearbyPlaceError("");
  }, [place]);

  const mapRef = useRef<google.maps.Map>(); // Ref to store the map object
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (markerRef.current && !markerPosition) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [markerPosition]);

  const pathsQuery = api.main.findPaths.useQuery();
  const airportsQuery = api.main.findAirports.useQuery();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameError("");
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setDescription(e.target.value);
  };

  // Function to be called when a place is selected
  const handlePlaceSelection = (selectedPlace: PlaceInfo | null) => {
    setPlace(selectedPlace);
    setMarkerError("");
    if (selectedPlace && mapRef.current) {
      const newCenter = new google.maps.LatLng(
        selectedPlace.location.latitude,
        selectedPlace.location.longitude,
      );
      mapRef.current.setCenter(newCenter); // Update the map center
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
  };

  const getDetailsFromCoords = async (latitude: number, longitude: number) => {
    // Ensure the Geocoder is defined
    if (!new google.maps.Geocoder()) {
      console.error("Geocoder is not available");
      return;
    }

    const geocoder = new google.maps.Geocoder();

    try {
      const response = await geocoder.geocode({
        location: { lat: latitude, lng: longitude },
      });
      if (response.results[0]) {
        return response.results[0];
      } else {
        return null;
      }
    } catch (error) {
      console.error("Geocoder failed due to:", error);
      return null;
    }
  };

  interface ClosestPathResults {
    path: {
      path_id: string;
    };
    distance: number;
  }

  interface ClosestAirportResults {
    airport: {
      iata_code: string;
    };
    distance: number;
  }

  const getClosestPathMutation = api.main.getClosestPath.useMutation({});
  const getClosestAirportMutation = api.main.getClosestAirport.useMutation({});
  const getAverageAltitudeMutation = api.main.getAverageAltitude.useMutation(
    {},
  );
  const getNearbyPlacesMutation = api.main.getNearbyPlaces.useMutation({});

  const handleSubmit = async () => {
    if (!name && !markerRef.current) {
      setNameError("Enter a name");
      setMarkerError("Choose a place");
      return;
    } else if (!name) {
      setNameError("Enter a name");
      return;
    } else if (!markerRef.current) {
      setMarkerError("Choose a place");
      return;
    }

    let address = "";
    let googleMapsUri = "";
    if (!place && !markerPosition) {
      // no location selected
      console.error("Place or marker position is not defined");
      return;
    } else if (!place) {
      //marker was placed on map
      try {
        const markerDetails = await getDetailsFromCoords(
          markerPosition!.latitude,
          markerPosition!.longitude,
        );
        if (markerDetails) {
          address = markerDetails?.formatted_address;
        }
      } catch (error) {
        console.error("Error:", error);
      }
    } else {
      // place was selected from search
      address = place.formattedAddress;
      googleMapsUri = place.googleMapsUri;
    }
    const latitude = markerPosition?.latitude;
    const longitude = markerPosition?.longitude;

    const closestPathResults = (await getClosestPathMutation.mutateAsync({
      latitude: markerPosition!.latitude,
      longitude: markerPosition!.longitude,
    })) as unknown as ClosestPathResults;

    let pathId = null;
    let distanceFromFlightpath = null;
    if (closestPathResults.distance < 0.4) {
      pathId = closestPathResults.path.path_id;
      distanceFromFlightpath = closestPathResults.distance;
    }

    const closestAirportResults = (await getClosestAirportMutation.mutateAsync({
      latitude: markerPosition!.latitude,
      longitude: markerPosition!.longitude,
    })) as unknown as ClosestAirportResults;

    let iataCode = null;
    let distanceFromAirport = null;
    if (closestAirportResults.distance <= 20) {
      iataCode = closestAirportResults.airport.iata_code;
      if (iataCode && pathId) {
        if (iataCode != pathId.substring(0, 3)) {
          iataCode = pathId.substring(0, 3);
        }
      }
      distanceFromAirport = closestAirportResults.distance;
    }

    let averageAltitude = null;
    if (iataCode) {
      averageAltitude = await getAverageAltitudeMutation.mutateAsync({
        latitude: markerPosition!.latitude,
        longitude: markerPosition!.longitude,
        iataCode: iataCode ?? "",
      });
      averageAltitude = isNaN(Number(averageAltitude)) ? null : averageAltitude;
    } else {
      averageAltitude = null;
    }

    const nearbyPlaces = await getNearbyPlacesMutation.mutateAsync({
      latitude: markerPosition!.latitude,
      longitude: markerPosition!.longitude,
    });

    if (nearbyPlaces && nearbyPlaces.length > 0) {
      if (nearbyPlaces[0]?.isVerified) {
        setNearbyPlaceError(
          `${nearbyPlaces[0]?.name} is nearby and has already been added to our database`,
        );
      } else {
        setNearbyPlaceError(
          `${nearbyPlaces[0]?.name} is nearby and has already been submitted and will be added to our database when it is approved`,
        );
      }
      return;
    }

    const newPlace = {
      name: name,
      address: address,
      description: description,
      latitude: latitude,
      longitude: longitude,
      pathId: pathId,
      googleMapsUri: googleMapsUri,
      iataCode: iataCode,
      distanceFromFlightpath: distanceFromFlightpath,
      averageAltitude: averageAltitude as number | null,
      distanceFromAirport: distanceFromAirport,
      userId: session!.user?.id,
    };
    setAverageAltitude(averageAltitude as number | null);
    setNewPlace(newPlace);
    setPopUpOpen(true);
  };

  const addPlaceMutation = api.main.addPlace.useMutation();

  const addNewPlace = async () => {
    if (newPlace) {
      // Update newPlace with the latest averageAltitude value
      const updatedNewPlace = {
        ...newPlace,
        averageAltitude: averageAltitude,
      };
      if (!updatedNewPlace.averageAltitude) {
        setAltitudeError("Average altitude cannot be null");
        return;
      }

      let altitudeEstimated = false;
      if (newPlace.averageAltitude != updatedNewPlace.averageAltitude) {
        altitudeEstimated = true;
      }

      try {
        await addPlaceMutation.mutateAsync({
          name: updatedNewPlace.name,
          address: updatedNewPlace.address,
          ...(updatedNewPlace.description && {
            description: updatedNewPlace.description,
          }),
          latitude: updatedNewPlace.latitude!,
          longitude: updatedNewPlace.longitude!,
          ...(updatedNewPlace.pathId && { pathId: updatedNewPlace.pathId }),
          ...(updatedNewPlace.googleMapsUri && {
            googleMapsURI: updatedNewPlace.googleMapsUri,
          }),
          ...(updatedNewPlace.iataCode && {
            iataCode: updatedNewPlace.iataCode,
          }),
          ...(updatedNewPlace.distanceFromFlightpath && {
            distanceFromFlightpath: updatedNewPlace.distanceFromFlightpath,
          }),
          averageAltitude: updatedNewPlace.averageAltitude,
          altitudeEstimated: altitudeEstimated,
          ...(updatedNewPlace.distanceFromAirport && {
            distanceFromAirport: updatedNewPlace.distanceFromAirport,
          }),
          userId: updatedNewPlace.userId!,
        });
      } catch (error) {
        console.error("Error adding new place: ", error);
      }

      setPopUpOpen(false);
      setAltitudeError("");
      setNewPlace(null);
      setName("");
      setDescription("");
      setMarkerPosition(undefined);
      setPlace(null);
      setAverageAltitude(null);
    }
  };

  if (
    pathsQuery.isLoading ||
    airportsQuery.isLoading ||
    addPlaceMutation.isLoading
  ) {
    return <Loading />;
  }

  return (
    <>
      <Navbar />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "calc(100vh - 80px)", // Subtract the height of the Navbar
          padding: "20px",
        }}
      >
        <h1
          style={{
            position: "absolute",
            top: "80px",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontWeight: "bold",
            fontSize: "2em",
            margin: "20px 0",
            textAlign: "center",
            width: "80%",
          }}
        >
          Help us expand our database by contributing your own favorite
          planespotting locations
        </h1>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            alignItems: "center",
            overflowY: "auto", // Add a scrollbar to the inner div if necessary
            maxHeight: "calc(100vh - 80px)", // Subtract the height of the Navbar
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleSubmit();
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              marginRight: "20px",
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              height: "50%", // Adjust if necessary
            }}
          >
            <label style={{ marginBottom: "10px" }}>
              <div>Name:</div>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  padding: "5px",
                  marginTop: "5px",
                }}
              />
              {nameError && <div style={{ color: "red" }}>{nameError}</div>}
            </label>
            <label style={{ marginBottom: "10px" }}>
              <div>Description:</div>
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  padding: "5px",
                  marginTop: "5px",
                }}
              />
            </label>
            <button
              type="submit"
              style={{
                border: "1px solid #ccc",
                borderRadius: "5px",
                padding: "5px",
                marginTop: "5px",
                backgroundColor: "#0000FF",
                color: "white",
              }}
            >
              Submit
            </button>
          </form>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "240px",
            }}
          >
            {markerError && <div style={{ color: "red" }}>{markerError}</div>}
            {nearbyPlaceError && (
              <div style={{ color: "red" }}>{nearbyPlaceError}</div>
            )}
            <h2>Search for a place</h2>
            <ContributeLocationSearch onSearch={handlePlaceSelection} />
            <h2>Or select the location on the map</h2>

            <MapComponent
              location={location}
              ipLocation={ipLocation}
              paths={pathsQuery.data ?? []}
              airports={airportsQuery.data ?? []}
              markerRef={markerRef}
              setMarkerPosition={setMarkerPosition}
              place={place}
              setPlace={setPlace}
              setMarkerError={setMarkerError}
            />
          </div>
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
                setAltitudeError("");
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
            <h2>New Place Details</h2>
            {newPlace && (
              <>
                <p>Name: {newPlace.name}</p>
                <p>Address: {newPlace.address}</p>
                <p>Description: {newPlace.description}</p>
                <p>Latitude: {newPlace.latitude}</p>
                <p>Longitude: {newPlace.longitude}</p>
                <p>Path ID: {newPlace.pathId}</p>
                <p>Google Maps URI: {newPlace.googleMapsUri}</p>
                <p>IATA Code: {newPlace.iataCode}</p>
                <p>
                  Distance from Flightpath: {newPlace.distanceFromFlightpath}
                </p>
                <label>
                  Average Altitude:
                  <input
                    type="number"
                    min="0"
                    value={averageAltitude ?? ""}
                    placeholder="Estimate the altitude"
                    onChange={(e) => {
                      setAverageAltitude(
                        e.target.value ? Number(e.target.value) : null,
                      );
                      setAltitudeError("");
                    }}
                  />
                </label>
                {altitudeError && (
                  <div style={{ color: "red" }}>{altitudeError}</div>
                )}
                <p>Distance from Airport: {newPlace.distanceFromAirport}</p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={addNewPlace}
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: "5px",
                      padding: "5px",
                      marginTop: "5px",
                      backgroundColor: "#0000FF",
                      color: "white",
                    }}
                  >
                    Submit
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
