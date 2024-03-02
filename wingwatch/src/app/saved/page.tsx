"use client";

import { api } from "~/trpc/react";
import Navbar from "../_components/Navbar";

export default function Saved() {
  const session = api.main.getSession.useQuery().data;
  const userId = session?.user?.id;
  const { data: savedPlaces, isLoading, refetch } = api.main.findSavedPlaces.useQuery(
    { id: userId! },
    { enabled: !!userId },
  );
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

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div>Loading...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="w-full mt-5">
        <div className="sticky top-0 z-10 bg-white p-4">
          <h1 className="mb-4 text-2xl font-bold">Saved Places</h1>
        </div>
        <div className="overflow-auto p-4 pt-0" style={{ maxHeight: "calc(100vh - 64px)" }}>
          <div className="space-y-4">
            {savedPlaces?.savedPlaces.map((place) => (
              <div key={place.place_id} className="flex items-center justify-between border p-4">
                <div>
                  <h3>{place.name}</h3>
                  {place.description && <p>Description: {place.description}</p>}
                  <p>Address: {place.address}</p>
                  {/* Add more details as per your requirement */}
                  {/* Assuming you have a routing mechanism to view details */}
                  <a href={`/place/?id=${place.place_id}`} className="text-blue-500 hover:text-blue-700">View Details</a>
                </div>
                <button
                  onClick={() => handleUnsavePlace(place.place_id)}
                  className="ml-4 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-700"
                >
                  Unsave
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
