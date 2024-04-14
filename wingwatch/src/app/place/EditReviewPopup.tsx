import { useState, useEffect } from "react";
import InteractiveRatingBar from "./InteractiveRatingBar";
import NextImage from "next/image";
import { api } from "~/trpc/react";

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

export default function EditReviewPopup({
  closeEditReviewPopup,
  review,
}: {
  closeEditReviewPopup: () => void;
  review: Review | undefined;
}) {
  const [newRating, setNewRating] = useState(review?.rating ?? 0);
  const [newTitle, setNewTitle] = useState(review?.title ?? "");
  const [newContent, setNewContent] = useState(review?.content ?? "");
  const [updatedImages, setUpdatedImages] = useState(review?.images ?? []);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    console.log("removedImages", removedImages);
    console.log("uploadedImages", uploadedImages);
  }, [removedImages, uploadedImages]);

  const handleRatingSelect = (selectedRating: number) => {
    setNewRating(selectedRating);
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
      setUploadedImages(filesArray);

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

  const editReviewMutation = api.main.editReview.useMutation();
  const deleteImageMutation = api.main.deleteImage.useMutation();
  const imageMutation = api.main.addImage.useMutation();

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    editReviewMutation.mutate({
      id: review!.id,
      title: newTitle,
      content: newContent,
      rating: newRating,
    });

    await Promise.all(
      removedImages.map((imageId) =>
        deleteImageMutation.mutate({ id: imageId }),
      ),
    );

    if (uploadedImages.length > 0) {
      const uploadPromises = uploadedImages.map(async (image) => {
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
          placeId: review!.placeId,
          reviewId: review!.id,
          file: base64Image, // Use the resolved base64 string
        });
      });
      // Wait for all image upload operations to complete
      await Promise.all(uploadPromises);
    }

    closeEditReviewPopup();
  };

  const maxImagesVisible = 4;
  const [currentStartIndex, setCurrentStartIndex] = useState(0);

  const handleNext = () => {
    if (currentStartIndex < review!.images.length - maxImagesVisible) {
      setCurrentStartIndex(currentStartIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStartIndex > 0) {
      setCurrentStartIndex(currentStartIndex - 1);
    }
  };

  const removeImage = (id: string) => {
    const updatedImagesCopy = [...updatedImages];
    const imageIndex = updatedImagesCopy.findIndex((image) => image.id === id);
    updatedImagesCopy.splice(imageIndex, 1);
    setUpdatedImages(updatedImagesCopy);

    setRemovedImages((prev) => [...prev, id]);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={closeEditReviewPopup}
      >
        <div className="fixed inset-0 flex items-center justify-center">
          <div
            className="flex min-w-[800px] flex-col rounded bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()} // Stops event propagation
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 text-center">
                <h2 className="text-2xl font-semibold">Edit Review</h2>
              </div>
              <button
                onClick={closeEditReviewPopup}
                className="text-lg font-bold"
              >
                &times;
              </button>
            </div>
            {review && (
              <>
                <InteractiveRatingBar
                  onRatingSelected={handleRatingSelect}
                  initialRating={review.rating}
                />
                <div className="my-4 flex">
                  <div className="w-1/2">
                    <div className="mb-4">
                      <input
                        className="w-full border p-2"
                        placeholder="Title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                    </div>
                    <textarea
                      className="w-full border p-2"
                      rows={8}
                      placeholder="Content..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      style={{ resize: "none" }}
                    />
                  </div>
                  <div className="ml-4 flex w-1/2 flex-col justify-between">
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
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {imagePreviews.slice(0, 4).map((src, index) => (
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
                    <div className="flex flex-col">
                      <div className="flex items-center justify-end">
                        <button
                          className={`mr-2 ${currentStartIndex <= 0 ? "invisible" : ""}`}
                          onClick={handlePrev}
                          style={{ userSelect: "none" }}
                        >
                          &lt;
                        </button>
                        <div className="grid grid-cols-4 gap-2">
                          {updatedImages
                            .slice(
                              currentStartIndex,
                              currentStartIndex + maxImagesVisible,
                            )
                            .map((image, index) => (
                              <div
                                key={image.id}
                                className="relative h-20 w-20 select-none overflow-hidden rounded-md"
                              >
                                <NextImage
                                  src={`https://wingwatch.nyc3.cdn.digitaloceanspaces.com/${image.placeId}/${image.reviewId}/${image.id}.${image.type.split("/")[1]}`}
                                  alt={`Review Image ${currentStartIndex + index + 1}`}
                                  height={80}
                                  width={80}
                                  className="min-h-full min-w-full object-cover"
                                  draggable={false}
                                />
                                <button
                                  onClick={() => removeImage(image.id)}
                                  className="absolute right-0 top-0 mr-0 mt-0 flex h-5 w-5 items-center justify-center rounded-full bg-gray-300"
                                  style={{ userSelect: "none" }}
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                        </div>
                        <button
                          className={`ml-2 ${currentStartIndex >= updatedImages.length - maxImagesVisible ? "invisible" : ""}`}
                          onClick={handleNext}
                          style={{ userSelect: "none" }}
                        >
                          &gt;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            <button
              type="button"
              className="mt-4 w-full rounded bg-blue-500 py-2 text-white"
              onClick={() => handleSubmit()}
              style={{ userSelect: "none" }}
              disabled={submitting}
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
