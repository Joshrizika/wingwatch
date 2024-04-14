"use client";

import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useState, useEffect } from "react";
import InteractiveRatingBar from "./InteractiveRatingBar";
import NextImage from "next/image";
interface ReviewProps {
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export default function Review({ onClose, onReviewSubmitted }: ReviewProps) {
  const id = useSearchParams().get("id");
  const session = api.main.getSession.useQuery().data;
  const placeQuery = api.main.findPlace.useQuery({ id: id! });
  const reviewMutation = api.main.addReview.useMutation();
  const imageMutation = api.main.addImage.useMutation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [ratingError, setRatingError] = useState(false); // New state for rating error

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    // Check if the current user has already submitted a review
    if (session?.user?.id) {
      const userReview = placeQuery.data?.reviews?.find(
        (review) => review.userId === session.user.id,
      );
      setHasReviewed(!!userReview);
    }
  }, [placeQuery.data, session?.user?.id]);

  const handleRatingSelect = (selectedRating: number) => {
    setRating(selectedRating);
    setRatingError(false); // Reset the error state when a rating is selected
  };

  useEffect(() => {
    // Cleanup function to revoke object URLs
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setImages(filesArray);

      // Cleanup old URLs
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));

      // Create new URLs for the current set of files
      const newImagePreviews = filesArray.map((file) =>
        URL.createObjectURL(file),
      );
      setImagePreviews(newImagePreviews);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);

      fileReader.onload = () => {
        resolve(fileReader.result as string); // Cast to string
      };

      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  };

  const [submitted, setSubmitted] = useState(false);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the form from causing a page reload

    if (rating === 0) {
      setRatingError(true); // Set the error state if no rating is selected
      return;
    }

    if (session && !hasReviewed) {
      try {
        setSubmitted(true);
        const reviewResponse = await reviewMutation.mutateAsync({
          title: title,
          content: content,
          rating: rating,
          userId: session.user?.id,
          placeId: id!,
        });

        const reviewId = reviewResponse.id; // Capture the review ID from the mutation response

        if (images.length > 0) {
          const uploadPromises = images.map(async (image) => {
            let imageWidth = 0,
              imageHeight = 0;
            const img = new Image();
            img.src = URL.createObjectURL(image);
            await new Promise((resolve) => {
              img.onload = () => {
                imageWidth = img.width;
                imageHeight = img.height;
                resolve(true);
              };
            });

            const base64Image = await convertToBase64(image); // Wait for the Promise to resolve
            return imageMutation.mutateAsync({
              name: image.name,
              size: image.size,
              type: image.type,
              height: imageHeight,
              width: imageWidth,
              placeId: id!,
              reviewId: reviewId,
              file: base64Image, // Use the resolved base64 string
            });
          });

          // Wait for all image upload operations to complete
          await Promise.all(uploadPromises);
        }
        await placeQuery.refetch();
        onReviewSubmitted();
        onClose();
      } catch (error) {
        console.error("Error in form submission or image upload:", error);
      }
    }
  };

  return (
    <>
      <div
        className="z-15 fixed inset-0 bg-black bg-opacity-10"
        onClick={onClose}
        style={{ zIndex: 2 }}
      >
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div
            className="mt-5 flex min-w-[800px] flex-col rounded bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()} // Add this line to stop event propagation
          >
            <div className=" flex items-start justify-center">
              <h2 className="mx-auto text-2xl font-semibold">Leave a Review</h2>
              <button onClick={onClose} className="text-lg font-bold">
                &times;
              </button>
            </div>
            <div className="mb-4 items-center">
              <InteractiveRatingBar onRatingSelected={handleRatingSelect} />
              {ratingError && (
                <p className="text-red-500">Please enter a rating</p>
              )}{" "}
              {/* Display error message if no rating is selected */}
            </div>
            <form className="flex-1" onSubmit={handleSubmit}>
              <div className="mt-4 flex flex-1">
                <div className="flex flex-1 flex-col">
                  <input
                    className="mb-4 w-full border p-2"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <textarea
                    className="mb-4 w-full border p-2"
                    rows={8}
                    placeholder="Content..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{ resize: "none" }}
                  />
                </div>
                {/* Image Upload */}
                <div className="flex flex-col p-4">
                  <h3 className="mb-2 text-center text-lg font-semibold">
                    Upload Images
                  </h3>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                  {/* Image preview section */}
                  <div className="mt-4 grid grid-cols-4 grid-rows-2 gap-2">
                    {imagePreviews.slice(0, 8).map((src, index) => (
                      <div
                        key={index}
                        className="h-20 w-20 overflow-hidden rounded-lg"
                      >
                        <NextImage
                          src={src}
                          alt={`Preview ${index}`}
                          className="h-full w-full object-cover object-center"
                          layout="fixed"
                          width={80}
                          height={80}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {session && !hasReviewed ? (
                <button
                  type="submit"
                  className="mt-4 w-full rounded bg-blue-500 py-2 text-white"
                  disabled={submitted}
                >
                  {submitted ? "Submitting..." : "Submit Review"}
                </button>
              ) : (
                <p className="mt-4 text-red-500">
                  You have already submitted a review for this place.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
