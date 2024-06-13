"use client";

import Navbar from "../_components/Navbar";
import RatingBar from "../_components/RatingBar";
import Review from "./Review";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Suspense } from "react";
import Loading from "../_components/Loading";
import { Loader } from "@googlemaps/js-api-loader";
import ImageDisplay from "./ImageDisplay";
import Image from "next/image";
import EditReviewPopup from "./EditReviewPopup";

export default function Place() {
  return (
    <Suspense fallback={<Loading />}>
      <PlaceContent />
    </Suspense>
  );
}

function PlaceContent() {
  const id = useSearchParams().get("id");
  const session = api.main.getSession.useQuery().data;
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
        },
      },
    );
  };

  //Place Rating

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

  //Map Initialization
  const [isMapLoaded, setIsMapLoaded] = useState(false);

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
        minZoom: 2,
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
              icon: {
                url: "./PlaceIcon.png",
                scaledSize: new google.maps.Size(28, 40),
              },
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
              strokeColor: "#34baeb",
              strokeOpacity: 0.8,
              strokeWeight: 5,
            });

            new google.maps.Marker({
              map: map,
              position: {
                lat: placeQuery.data?.airportDetails?.latitude ?? 0,
                lng: placeQuery.data?.airportDetails?.longitude ?? 0,
              },
              title: placeQuery.data?.airportDetails?.name,
              icon: {
                url: "./AirportIcon.png",
                scaledSize: new google.maps.Size(35, 50),
              },
            });
            setIsMapLoaded(true);
          }
        })
        .catch((e) => {
          console.error("Failed to load the map library:", e);
        });
    };

    if (!isMapLoaded) {
      initializeMap(
        Number(placeQuery.data?.latitude),
        Number(placeQuery.data?.longitude),
      );
    }
  }, [placeQuery, isMapLoaded]);

  //Place Image Handling
  interface DisplayImage {
    authorAttributions: [
      {
        displayName: string;
        uri: string;
        photoUri: string;
      },
    ];
    heightPx: number;
    name: string;
    widthPx: number;
    type: string;
  }

  const [googleMapsImages, setGoogleMapsImages] = useState<DisplayImage[]>([]);
  const [databaseImages, setDatabaseImages] = useState<DisplayImage[]>([]);

  const [googleMapsImagesRecieved, setGoogleMapsImagesReceived] =
    useState(false);
  const [databaseImagesRecieved, setDatabaseImagesReceived] = useState(false);

  const [refetchingImages, setRefetchingImages] = useState(false);

  useEffect(() => {
    const getPlaceIdFromCoords = async (
      latitude: number,
      longitude: number,
    ) => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: "weekly",
        libraries: ["places"],
      });

      try {
        await loader.load(); // Ensures the Google Maps API is loaded before proceeding
        const geocoder = new google.maps.Geocoder();

        const response = await geocoder.geocode({
          location: { lat: latitude, lng: longitude },
        });
        if (response.results[0]) {
          return response.results[0].place_id;
        } else {
          return null;
        }
      } catch (error) {
        console.error("Geocoder failed due to:", error);
        return null;
      }
    };

    const getGoogleMapsImages = async () => {
      if (placeQuery.data?.latitude && placeQuery.data?.longitude) {
        const placeId = await getPlaceIdFromCoords(
          placeQuery.data.latitude,
          placeQuery.data.longitude,
        );
        fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
            "X-Goog-FieldMask": "photos",
          },
        })
          .then((response) => response.json())
          .then((data: { photos: DisplayImage[] }) => {
            if (data.photos) {
              const photosWithTypes = data.photos.map((photo) => ({
                ...photo,
                type: "GM",
              }));
              setGoogleMapsImages(photosWithTypes);
            }
            setGoogleMapsImagesReceived(true);
          })
          .catch((error) =>
            console.error("Failed to fetch place details:", error),
          );
      }
    };

    const getDatabaseImages = async () => {
      if (!placeQuery.isFetching) {
        setRefetchingImages(false);
      }

      const images = placeQuery.data?.images;

      if (images && !refetchingImages) {
        const displayImages: DisplayImage[] = images.map((image) => ({
          authorAttributions: [
            {
              displayName: image.review.user?.name ?? "Unknown",
              uri: "",
              photoUri: image.review.user?.image ?? "/DefaultProfilePicture.png",
            },
          ],
          heightPx: image.height, // Fill in with appropriate value
          name: `https://wingwatch.nyc3.cdn.digitaloceanspaces.com/${image.placeId}/${image.review.id}/${image.id}.${image.type.split("/")[1]}`,
          widthPx: image.width, // Fill in with appropriate value
          type: "DB",
        }));
        setDatabaseImages(displayImages);
        setDatabaseImagesReceived(true);
      }
    };

    if (!googleMapsImagesRecieved) {
      void getGoogleMapsImages();
    }
    if (!databaseImagesRecieved) {
      void getDatabaseImages();
    }
  }, [
    placeQuery,
    googleMapsImagesRecieved,
    databaseImagesRecieved,
    refetchingImages,
  ]);

  const [images, setImages] = useState<DisplayImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    // Check if both image sources have been received
    if (googleMapsImagesRecieved && databaseImagesRecieved) {
      // Check if both image arrays are empty
      if (googleMapsImages.length === 0 && databaseImages.length === 0) {
        setImagesLoading(false);
      } else {
        // Set imagesLoading to false only if there are images
        setImages([...databaseImages, ...googleMapsImages]);
        setImagesLoading(false);
      }
    }
  }, [
    googleMapsImagesRecieved,
    databaseImagesRecieved,
    googleMapsImages,
    databaseImages,
  ]);

  const resetDatabaseImagesReceived = async () => {
    setDatabaseImagesReceived(false);

    try {
      setRefetchingImages(true);
    } catch (error) {
      console.error("Failed to refetch images:", error);
    }
  };

  useEffect(() => {
    setDatabaseImages([]);
    setDatabaseImagesReceived(false);
    setGoogleMapsImages([]);
    setGoogleMapsImagesReceived(false);
    setIsMapLoaded(false);
    setImages([]);
    setImagesLoading(true);
  }, [id]);

  //Review Image Popup
  const [popupVisible, setPopupVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [popupImages, setPopupImages] = useState<PopUpImageProps[]>([]);

  interface PopUpImageProps {
    id: string;
    name: string;
    size: number;
    height: number;
    width: number;
    type: string;
    placeId: string;
    reviewId: string;
  }

  const openPopup = (images: PopUpImageProps[], index: number) => {
    setCurrentImageIndex(index);
    setPopupVisible(true);
    setPopupImages(images);
  };

  const closePopup = () => {
    setPopupVisible(false);
    setPopupImages([]);
  };

  const goToPreviousImage = (numImages: number) => {
    setCurrentImageIndex((prev) => (prev - 1 + numImages) % numImages);
  };

  const goToNextImage = (numImages: number) => {
    setCurrentImageIndex((prev) => (prev + 1) % numImages);
  };

  //Edit Review

  interface Review {
    id: string;
    title: string | null;
    content: string | null;
    rating: number;
    timestamp: Date;
    images: {
      id: string;
      name: string;
      size: number;
      height: number;
      width: number;
      type: string;
      placeId: string;
      reviewId: string;
    }[];
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: Date | null;
      image: string | null;
      isAdmin: boolean;
    } | null;
    placeId: string;
  }

  const [editReviewModalVisible, setEditReviewModalVisible] = useState(false);
  const [deleteReviewModalVisible, setDeleteReviewModalVisible] =
    useState(false);

  const [reviewToEdit, setReviewToEdit] = useState<Review>();

  const closeEditReviewPopup = async () => {
    setEditReviewModalVisible(false);
    setReviewToEdit(undefined);
    await placeQuery.refetch();
    await resetDatabaseImagesReceived();
  };

  //Delete Review

  const deleteReviewMutation = api.main.deleteReview.useMutation();

  const [reviewToDelete, setReviewToDelete] = useState<Review>();

  const handleDeleteReview = async () => {
    deleteReviewMutation.mutate({ id: reviewToDelete!.id });
    setDeleteReviewModalVisible(false);
    setReviewToDelete(undefined);
    await placeQuery.refetch();
    await resetDatabaseImagesReceived();
  };

  //Loading
  if (session) {
    if (placeQuery.isLoading || isPlaceSavedQuery.isLoading) {
      return <Loading />;
    }
  } else {
    if (placeQuery.isLoading) {

      return <Loading />;
    }
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
                <p className="mt-2"><em>{placeQuery.data?.description}</em></p>
              )}
            </div>
            <p className="mt-2">Located at: {placeQuery.data?.address}</p>
            <p className="mt-2">
              Airport: {placeQuery.data?.airportDetails?.name} (
              {placeQuery.data?.airportDetails?.iata_code})
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
            <div className="mt-16 text-center">
              <h2 className="mb-4 text-2xl font-bold">Rating</h2>
              <div className="flex justify-center">
                <RatingBar rating={totalRating} />
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2">
            <div id="map" className="h-[500px] w-full"></div>
          </div>
        </div>

        {/* Save/Unsave Button */}
        {session && (
          <div className="mb-2 ml-4 flex justify-start">
            <button
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
              onClick={isPlaceSaved ? handleUnsavePlace : handleSavePlace}
            >
              {isPlaceSaved ? "Unfavorite" : "Favorite"}
            </button>
          </div>
        )}

        {/* Image Display */}
        <div className="ml-1 mr-1 mt-4">
          <ImageDisplay images={images ?? null} imagesLoading={imagesLoading} />
        </div>

        {/* Review Section */}
        <div className="mt-10 w-full">
          {session && (
            <div className="mb-4 ml-4 flex justify-start">
              <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onClick={toggleReviewModal}
              >
                Add Review
              </button>
            </div>
          )}
          <h2 className="mb-4 ml-4 text-2xl font-bold">Reviews</h2>
          {reviews && reviews.length > 0 ? (
            reviews.map((review) => (
              <div
                key={review.id}
                className="relative mb-4 ml-1 mr-1 flex rounded-lg border p-4 shadow-lg"
              >
                {/* Review Content */}
                <div className="mr-8 flex-grow" style={{ maxWidth: "50%" }}>
                  <div className="flex items-center">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {review.title ?? "No Title"}
                      </h2>
                      <p className="text-gray-700">
                        {review.content ?? "No Content"}
                      </p>
                      <div className="mt-2">
                        <RatingBar rating={review.rating} />
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <Image
                          src={
                            review.user?.image ?? "/DefaultProfilePicture.png"
                          }
                          alt={review.user?.name ?? "User Image"}
                          width={24}
                          height={24}
                          className="mr-2 h-8 w-8 rounded-full"
                        />
                        {review.user?.name ?? "Unknown"}
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        {format(new Date(review.timestamp), "PP")}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Image Display */}
                <div className="right-0 top-0 flex h-full w-1/2">
                  <div className="flex flex-col items-center">
                    {review.images && review.images.length > 0 && (
                      <h3 className="mb-2 text-lg font-bold">Images</h3>
                    )}
                    <div
                      className="grid grid-flow-col-dense grid-rows-2 gap-2"
                      style={{ gridAutoRows: "minmax(80px, auto)" }}
                    >
                      {review.images?.slice(0, 6).map((image, imgIndex) => (
                        <div
                          key={imgIndex}
                          className={`h-20 w-20 cursor-pointer overflow-hidden rounded-lg ${review.images.length > 6 && imgIndex === 5 ? "relative" : ""}`}
                          onClick={() => {
                            openPopup(review.images, imgIndex);
                          }}
                        >
                          <Image
                            src={`https://wingwatch.nyc3.cdn.digitaloceanspaces.com/${image.placeId}/${image.reviewId}/${image.id}.${image.type.split("/")[1]}`}
                            alt={`Review Image ${imgIndex + 1}`}
                            height={80}
                            width={80}
                            className="min-h-full min-w-full object-cover"
                          />
                          {review.images.length > 6 && imgIndex === 5 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                              <span
                                className="text-2xl text-white"
                                style={{ position: "relative", top: "-6px" }}
                              >
                                ...
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Edit/Delete Review Button */}
                <div className="absolute right-0 top-0 mr-2 flex h-full items-center justify-end">
                  {session?.user?.id === review.user?.id && (
                    <div className="flex flex-col">
                      <button
                        className="mb-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                        onClick={() => {
                          setEditReviewModalVisible(true);
                          setReviewToEdit(review);
                        }}
                      >
                        Edit Review
                      </button>
                      <button
                        className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                        onClick={() => {
                          setDeleteReviewModalVisible(true);
                          setReviewToDelete(review);
                        }}
                      >
                        Delete Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="mb-4 ml-4">
              <p>No reviews yet.</p>
            </div>
          )}
          {/* Modal display logic */}
          {isReviewModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <Review
                onClose={toggleReviewModal}
                onReviewSubmitted={async () => {
                  await resetDatabaseImagesReceived(); // Reset the state to trigger a refetch
                }}
              />
            </div>
          )}
        </div>
      </div>

      {popupVisible && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
          onClick={closePopup}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "80%",
              maxHeight: "80%",
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "8px",
              cursor: "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                cursor: "pointer",
              }}
              onClick={closePopup}
            >
              X
            </div>
            <div
              style={{
                position: "relative",
                backgroundColor: "#f0f0f0",
                height: "600px",
                width: `${600 * (popupImages[currentImageIndex]!.width / popupImages[currentImageIndex]!.height)}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {popupImages[currentImageIndex] && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      bottom: "20px",
                      left: "calc(50% - 60px)", // Adjusted for visibility and spacing
                      backgroundColor: "rgba(64, 64, 64, 0.8)", // Darker shade of gray
                      borderRadius: "50%",
                      width: "40px", // Ensuring circle shape
                      height: "40px", // Ensuring circle shape
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "white", // Making the arrow white
                      userSelect: "none", // Preventing text selection
                    }}
                    onClick={() => goToPreviousImage(popupImages.length)}
                  >
                    &lt;
                  </div>
                  {(() => {
                    const maxHeight = 4800;
                    const maxWidth = 4800;
                    let heightPx = popupImages[currentImageIndex]!.height;
                    let widthPx = popupImages[currentImageIndex]!.width;
                    const ratio = widthPx / heightPx;

                    if (heightPx > maxHeight || widthPx > maxWidth) {
                      if (ratio > 1) {
                        // width is greater
                        widthPx = maxWidth;
                        heightPx = Math.round(widthPx / ratio);
                      } else {
                        heightPx = maxHeight;
                        widthPx = Math.round(heightPx * ratio);
                      }
                    }

                    const imgSource = `https://wingwatch.nyc3.cdn.digitaloceanspaces.com/${popupImages[currentImageIndex]!.placeId}/${popupImages[currentImageIndex]!.reviewId}/${popupImages[currentImageIndex]!.id}.${popupImages[currentImageIndex]!.type.split("/")[1]}`;

                    return (
                      <Image
                        key={imgSource} // Add a unique key to trigger remount on index change
                        src={imgSource}
                        alt={`Image ${currentImageIndex}`}
                        height={600}
                        width={600 * (widthPx / heightPx)}
                      />
                    );
                  })()}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "20px",
                      left: "calc(50% + 20px)", // Adjusted for visibility and spacing
                      backgroundColor: "rgba(64, 64, 64, 0.8)", // Darker shade of gray
                      borderRadius: "50%",
                      width: "40px", // Ensuring circle shape
                      height: "40px", // Ensuring circle shape
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "white", // Making the arrow white
                      userSelect: "none", // Preventing text selection
                    }}
                    onClick={() => goToNextImage(popupImages.length)}
                  >
                    &gt;
                  </div>
                </>
              )}
              {!popupImages[currentImageIndex] && (
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    width: "100%",
                  }}
                >
                  <Loading />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editReviewModalVisible && (
        <EditReviewPopup
          closeEditReviewPopup={closeEditReviewPopup}
          review={reviewToEdit}
        />
      )}
      {deleteReviewModalVisible && (
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
          onClick={() => {
            setDeleteReviewModalVisible(false);
            setReviewToDelete(undefined);
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "5px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()} // Prevents click from propagating to the parent and closing the modal immediately
          >
            <button
              onClick={() => {
                setDeleteReviewModalVisible(false);
                setReviewToDelete(undefined);
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
            <p style={{ textAlign: "center", fontWeight: "bold" }}>
              Are you sure?
            </p>
            <p style={{ textAlign: "center", fontWeight: "bold" }}>
              This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => handleDeleteReview()}
              className="mt-4 flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete Review
            </button>
          </div>
        </div>
      )}
    </>
  );
}
