"use client";

import { api } from "~/trpc/react";
import Navbar from "../_components/Navbar";
import Link from "next/link";
import Loading from "../_components/Loading";

export default function MyPlaces() {
  const session = api.main.getSession.useQuery().data;
  const userId = session?.user?.id;

  const {
    data: savedPlaces,
    isLoading: savedLoading,
    refetch,
  } = api.main.findSavedPlaces.useQuery({ id: userId! }, { enabled: !!userId });

  const unsavePlaceMutation = api.main.unsavePlace.useMutation();

  const handleUnsavePlace = (placeId: string) => {
    unsavePlaceMutation.mutate(
      { userId: userId!, placeId },
      {
        onSuccess: () => {
          void refetch();
        },
      },
    );
  };
  
  const { data: contributedPlaces, isLoading: contributedLoading } =
    api.main.findContributedPlaces.useQuery(
      { userId: userId! },
      { enabled: !!userId },
    );

  if (savedLoading || contributedLoading) {
    return (
      <>
        <Loading />
      </>
    );
  }

  return (
    <>
      <Navbar />
      {(!savedPlaces?.savedPlaces.length && !contributedPlaces?.length) ? (
        <div className="mt-5 w-full text-center">
          <h2>No saved places</h2>
        </div>
      ) : (
        <div className="mt-5 w-full">
          {savedPlaces!.savedPlaces.length > 0 && (
            <>
              <div className="sticky top-0 bg-white p-4">
                <h1 className="mb-4 text-2xl font-bold">Favorited Places</h1>
              </div>
              <div
                className="overflow-auto p-4 pt-0"
                style={{ maxHeight: "calc(100vh - 64px)" }}
              >
                <div className="space-y-4">
                  {savedPlaces!.savedPlaces.map((place) => (
                    <div
                      key={place.place_id}
                      className="flex items-center justify-between border p-4"
                    >
                      <div>
                        <h3 className="font-semibold">{place.name}</h3>
                        {place.description && <p>Description: {place.description}</p>}
                        <p>Address: {place.address}</p>
                        {place.airport && (
                          <p>Airport: {place.airportDetails?.name}</p>
                        )}
                        {place.distance_from_flightpath && (
                          <p>
                            Distance from Flight Path:{" "}
                            {Math.round(place.distance_from_flightpath * 100) / 100}{" "}
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
                          {Math.round(place.average_altitude) === 1 ? "foot" : "feet"}
                        </p>
                        <Link href={`/place/?id=${place.place_id}`}>
                          <span className="text-blue-500 hover:text-blue-700">
                            View Details
                          </span>
                        </Link>
                      </div>
                      <button
                        onClick={() => handleUnsavePlace(place.place_id)}
                        className="ml-4 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-700"
                      >
                        Unfavorite
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {contributedPlaces!.length > 0 && (
            <>
              <div className="sticky top-0 bg-white p-4">
                <h1 className="mb-4 text-2xl font-bold">Contributed Places</h1>
              </div>
              <div
                className="overflow-auto p-4 pt-0"
                style={{ maxHeight: "calc(100vh - 64px)" }}
              >
                <div className="space-y-4">
                  {contributedPlaces!.map((place) => (
                    <div
                      key={place.place_id}
                      className="flex items-center justify-between border p-4"
                    >
                      <div>
                        <h3 className="font-semibold">{place.name}</h3>
                        {place.description && <p>Description: {place.description}</p>}
                        <p>Address: {place.address}</p>
                        {place.airport && (
                          <p>Airport: {place.airportDetails?.name}</p>
                        )}
                        {place.distance_from_flightpath && (
                          <p>
                            Distance from Flight Path:{" "}
                            {Math.round(place.distance_from_flightpath * 100) / 100}{" "}
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
                          {Math.round(place.average_altitude) === 1 ? "foot" : "feet"}
                        </p>
                        <Link href={`/place/?id=${place.place_id}`}>
                          <span className="text-blue-500 hover:text-blue-700">
                            View Details
                          </span>
                        </Link>
                      </div>
                      {place.isVerified ? (
                        <span className="rounded bg-green-500 px-2 py-1 text-white">
                          Verified
                        </span>
                      ) : (
                        <span className="rounded bg-yellow-500 px-2 py-1 text-white">
                          Under Review
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
