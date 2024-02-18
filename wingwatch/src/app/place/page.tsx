"use client";

import { useEffect } from "react";
import Navbar from "../_components/Navbar";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { unstable_noStore as noStore } from "next/cache";

const RatingBarWithStars = ({ rating }: { rating: number }) => {
  // Calculate the percentage of the bar that should be filled based on the rating
  const fillPercentage = (rating / 5) * 100;

  // Adjust the SVG width and viewBox if necessary to fully display all stars
  return (
    <div
      style={{
        position: "relative",
        width: "260px",
        height: "50px",
        backgroundColor: "transparent",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 260 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Define the star shape */}
        <defs>
          <clipPath id="star-mask">
            {/* Repeated star paths */}
            <path
              d="M12 .587l3.668 7.431 8.332 1.209-6.035 5.884 1.425 8.309-7.39-3.884-7.39 3.884 1.425-8.309-6.035-5.884 8.332-1.209L12 .587z"
              transform="scale(2.0833333)"
            />
            <path
              d="M37 .587l3.668 7.431 8.332 1.209-6.035 5.884 1.425 8.309-7.39-3.884-7.39 3.884 1.425-8.309-6.035-5.884 8.332-1.209L37 .587z"
              transform="scale(2.0833333)"
            />
            <path
              d="M62 .587l3.668 7.431 8.332 1.209-6.035 5.884 1.425 8.309-7.39-3.884-7.39 3.884 1.425-8.309-6.035-5.884 8.332-1.209L62 .587z"
              transform="scale(2.0833333)"
            />
            <path
              d="M87 .587l3.668 7.431 8.332 1.209-6.035 5.884 1.425 8.309-7.39-3.884-7.39 3.884 1.425-8.309-6.035-5.884 8.332-1.209L87 .587z"
              transform="scale(2.0833333)"
            />
            <path
              d="M112 .587l3.668 7.431 8.332 1.209-6.035 5.884 1.425 8.309-7.39-3.884-7.39 3.884 1.425-8.309-6.035-5.884 8.332-1.209L112 .587z"
              transform="scale(2.0833333)"
            />
          </clipPath>
        </defs>
        {/* Use the star shape as a mask */}
        <rect
          width="100%"
          height="100%"
          fill="transparent"
          clip-path="url(#star-mask)"
        />
        {/* The fill level bar, adjust the fill color to match your design */}
        <rect
          width={`${fillPercentage}%`}
          height="100%"
          fill="#f59e0b"
          clip-path="url(#star-mask)"
        />
      </svg>
    </div>
  );
};

export default function Place() {
  noStore();

  const id = useSearchParams().get("id");
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
      <Navbar />
      <div className="mt-5 flex min-h-screen">
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
              <RatingBarWithStars rating={totalRating} />
            </div>
          </div>
        </div>

        <div className="w-full md:h-auto md:w-1/2">
          <div id="map" className="h-1/2 w-full"></div>
        </div>
      </div>
    </>
  );
}
