"use client";

import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useState, useEffect } from "react";
import InteractiveRatingBar from "../_components/InteractiveRatingBar";

interface ReviewProps {
  onClose: () => void;
}

export default function Review({ onClose }: ReviewProps) {
  const id = useSearchParams().get("id");
  const session = api.main.getSession.useQuery().data;
  const placeQuery = api.main.findPlace.useQuery({ id: id! });
  const reviewMutation = api.main.addReview.useMutation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);

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
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the form from causing a page reload
    if (session && !hasReviewed) {
      reviewMutation.mutate(
        {
          title: title,
          content: content,
          rating: rating,
          userId: session.user?.id,
          placeId: id!,
        },
        {
          onSuccess: () => {
            onClose();
            void placeQuery.refetch();
          },
        },
      );
    }
  };

  return (
    <>
      <div
        className="z-15 fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      >
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="mt-5 min-w-[300px] rounded bg-white p-5 shadow-lg">
            <div className="flex justify-end">
              <button onClick={onClose} className="text-lg font-bold">
                &times;
              </button>
            </div>
            <h2 className="text-lg font-semibold">Leave a Review</h2>
            <form className="w-full max-w-md" onSubmit={handleSubmit}>
              <div>
                <InteractiveRatingBar onRatingSelected={handleRatingSelect} />
              </div>
              <input
                className="my-2 w-full border p-2"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="my-2 w-full border p-2"
                rows={4}
                placeholder="Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              {session && !hasReviewed ? (
                <button
                  type="submit"
                  className="mt-4 w-full rounded bg-blue-500 py-2 text-white"
                >
                  Submit Review
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
