"use client";

import { useEffect } from "react";
import Navbar from "../_components/Navbar";
import RatingBar from "../_components/RatingBar";
import Review from "../_components/Review";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { useState } from "react";
import { Suspense } from "react";
import Loading from "../_components/Loading";
import { Loader } from "@googlemaps/js-api-loader";

export default function Place() {
  // Wrap the component or the specific logic that requires useSearchParams within Suspense
  return (
    <Suspense fallback={<Loading />}>
      <PlaceContent />
    </Suspense>
  );
}

function PlaceContent() {
  const id = useSearchParams().get("id");
  const sessionQuery = api.main.getSession.useQuery();
  const session = sessionQuery.data;
  const placeQuery = api.main.findPlace.useQuery({ id: id! });
  const isPlaceSavedQuery = api.main.isPlaceSavedByUser.useQuery(
    {
      userId: session?.user?.id ?? "",
      placeId: id ?? "",
    },
    {
      // This option ensures the query only runs if the userId and placeId are available
      enabled: !!session?.user?.id && !!id,
    },
  );
  const savePlaceMutation = api.main.savePlace.useMutation();
  const unsavePlaceMutation = api.main.unsavePlace.useMutation();

  // Continue with your existing code, using isPlaceSavedQuery.data to determine if the place is saved
  const [isPlaceSaved, setIsPlaceSaved] = useState(false);
  useEffect(() => {
    setIsPlaceSaved(isPlaceSavedQuery.data ?? false);
  }, [isPlaceSavedQuery.data]);

  // Handle Save Place
  const handleSavePlace = () => {
    if (!session?.user?.id || !id) return;
    savePlaceMutation.mutate(
      {
        userId: session.user.id,
        placeId: id,
      },
      {
        onSuccess: () => {
          setIsPlaceSaved(true);
          // Optionally, refetch queries or perform other actions on success
        },
      },
    );
  };

  // Handle Unsave Place
  const handleUnsavePlace = () => {
    if (!session?.user?.id || !id) return;
    unsavePlaceMutation.mutate(
      {
        userId: session.user.id,
        placeId: id,
      },
      {
        onSuccess: () => {
          setIsPlaceSaved(false);
          // Optionally, refetch queries or perform other actions on success
        },
      },
    );
  };

  const reviews = placeQuery.data?.reviews;
  let totalRating;

  if (reviews && reviews.length > 0) {
    totalRating = reviews.reduce((sum: number, review: { rating: number }) => {
      return sum + review.rating;
    }, 0);
    totalRating = totalRating / reviews.length;
  } else {
    totalRating = 0;
  }

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const toggleReviewModal = () => {
    setIsReviewModalOpen(!isReviewModalOpen);
  };

  const initializeMap = (latitude: number, longitude: number) => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: "weekly",
      libraries: ["places", "marker"],
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
          const map = new Map(mapElement, mapOptions);

          // Add markers to the map based on the places
          new google.maps.Marker({
            map: map,
            position: {
              lat: placeQuery.data?.latitude ?? 0,
              lng: placeQuery.data?.longitude ?? 0,
            },
            title: placeQuery.data?.name,
          });

          const pathPoints: { lat: number; lng: number }[] =
            placeQuery.data?.path?.latitude?.map(
              (lat: number, index: number) => ({
                lat: lat,
                lng: placeQuery.data?.path?.longitude?.[index] ?? 0,
              }),
            ) ?? [];

          new google.maps.Polyline({
            map: map,
            path: pathPoints,
            geodesic: true,
            strokeColor: "#0000FF", // Customize color as needed
            strokeOpacity: 1.0,
            strokeWeight: 2,
          });

          new google.maps.Marker({
            map: map,
            position: {
              lat: placeQuery.data?.airportDetails?.latitude ?? 0,
              lng: placeQuery.data?.airportDetails?.longitude ?? 0,
            },
            title: placeQuery.data?.airportDetails?.name,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/purple-dot.png",
            },
          });
        }
      })
      .catch((e) => {
        console.error("Failed to load the map library:", e);
      });
  };

  initializeMap(
    Number(placeQuery.data?.latitude),
    Number(placeQuery.data?.longitude),
  );

  if (placeQuery.isLoading || isPlaceSavedQuery.isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Navbar />
      <div className="mt-5 flex min-h-screen flex-col">
        <div className="flex flex-wrap md:flex-nowrap">
          <div className="flex-1 p-5">
            <div className="text-center">
              <h1 className="text-xl font-bold">{placeQuery.data?.name}</h1>
              {placeQuery.data?.description && (
                <p className="mt-2">{placeQuery.data?.description}</p>
              )}
            </div>
            <p className="mt-2">Located at: {placeQuery.data?.address}</p>
            <p className="mt-2">
              Airport: {placeQuery.data?.airportDetails?.name}
            </p>
            {placeQuery.data?.distance_from_flightpath && (
              <p className="mt-2">
                Distance from Flightpath {placeQuery.data?.path_id}:{" "}
                {Math.round(placeQuery.data.distance_from_flightpath * 100) /
                  100}{" "}
                {Math.round(placeQuery.data.distance_from_flightpath * 100) /
                  100 ===
                1
                  ? "mile"
                  : "miles"}
              </p>
            )}
            {placeQuery.data?.average_altitude && (
              <p>
                Average Altitude: {placeQuery.data?.altitude_estimated && "~"}
                {Math.round(placeQuery.data?.average_altitude)}{" "}
                {Math.round(placeQuery.data?.average_altitude) === 1
                  ? "foot"
                  : "feet"}
              </p>
            )}
            {placeQuery.data?.distance_from_airport && (
              <p className="mt-2">
                Distance from Airport:{" "}
                {Math.round(placeQuery.data.distance_from_airport * 100) / 100}{" "}
                {Math.round(placeQuery.data.distance_from_airport * 100) /
                  100 ===
                1
                  ? "mile"
                  : "miles"}
              </p>
            )}

            {/* Gap and Rating section with header */}
            <div className="mt-8 text-center">
              <h2 className="mb-4 text-2xl font-bold">Rating</h2>
              <div className="flex justify-center">
                <RatingBar rating={totalRating} />
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2">
            <div id="map" className="h-full w-full"></div>
          </div>
        </div>

        {/* Save/Unsave Button */}
        <div className="mb-2 flex justify-start">
          <button
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            onClick={isPlaceSaved ? handleUnsavePlace : handleSavePlace}
          >
            {isPlaceSaved ? "Unsave" : "Save"}
          </button>
        </div>

        {/* Review Section */}
        <div className="mt-10 w-full">
          {session && (
            <div className="mb-4 flex justify-start">
              <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onClick={toggleReviewModal}
              >
                Add Review
              </button>
            </div>
          )}

          {/* Modal display logic */}
          {isReviewModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <Review onClose={toggleReviewModal} />
            </div>
          )}
          <h2 className="mb-4 text-2xl font-bold">Reviews</h2>
          {reviews && reviews.length > 0 ? (
            reviews.map((review) => (
              <div
                key={review.id}
                className="mb-4 rounded-lg border p-4 shadow-lg"
              >
                <div className="flex">
                  <div className="mr-4">
                    <RatingBar rating={review.rating} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {review.title ?? "No Title"}
                    </h3>
                    <p className="text-gray-700">
                      {review.content ?? "No Content"}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      User: {review.user?.name ?? "Unknown"}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Date: {format(new Date(review.timestamp), "PP")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No reviews yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
