"use client";

import { Suspense, useEffect } from "react";
import Navbar from "../_components/Navbar";
import RatingBar from "../_components/RatingBar";
import Review from "../_components/Review";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { useState } from "react";

export default function Place() {
  const id = useSearchParams().get("id");
  const session = api.main.getSession.useQuery().data;
  const placeQuery = api.main.findPlace.useQuery({ id: id! });

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

  useEffect(() => {
    // Dynamically load the Google Maps script with the initMap callback
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts&loading=async&callback=initMap`;
    script.async = true;
    document.body.appendChild(script);

    // Attach the initMap function to the window object
    window.initMap = function () {
      const map = new google.maps.Map(document.getElementById("map")!, {
        center: {
          lat: placeQuery.data?.latitude ?? 0,
          lng: placeQuery.data?.longitude ?? 0,
        },
        zoom: 12,
      });

      // Add markers to the map based on the places
      const marker = new google.maps.Marker({
        position: {
          lat: placeQuery.data?.latitude ?? 0,
          lng: placeQuery.data?.longitude ?? 0,
        },
        title: placeQuery.data?.name,
      });
      marker.setMap(map);

      const pathPoints: { lat: number; lng: number }[] =
        placeQuery.data?.path.latitude?.map((lat: number, index: number) => ({
          lat: lat,
          lng: placeQuery.data?.path.longitude?.[index] ?? 0,
        })) ?? [];

      const pathPolyline = new google.maps.Polyline({
        path: pathPoints,
        geodesic: true,
        strokeColor: "#0000FF", // Customize color as needed
        strokeOpacity: 1.0,
        strokeWeight: 2,
      });
      pathPolyline.setMap(map);
    };

    // Cleanup: Remove the script and clean up the window object
    return () => {
      document.body.removeChild(script);
      delete window.initMap;
    };
  }, [placeQuery.data]);

  return (
    <>
    <Suspense>
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
            <p className="mt-2">Airport: {placeQuery.data?.airport}</p>
            <p className="mt-2">
              Distance from the Flightpath:{" "}
              {placeQuery.data?.distance_from_flightpath}
            </p>
            <p className="mt-2">
              Average Altitude: {placeQuery.data?.average_altitude}
            </p>
            <p className="mt-2">
              Distance from Airport: {placeQuery.data?.distance_from_airport}
            </p>

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

        {/* Review Section moved to ensure it's below all content */}
        <div className="mt-10 w-full">
          {session && (
            <div className="mb-4 flex justify-start">
              {/* Replace the Link and its child button with this button */}
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
      </Suspense>
    </>
  );
}
