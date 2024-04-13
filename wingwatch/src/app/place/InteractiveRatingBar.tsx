import { useState } from "react";

const InteractiveRatingBar = ({
  onRatingSelected,
  initialRating = 0,
}: {
  onRatingSelected: (rating: number) => void;
  initialRating?: number;
}) => {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(initialRating); // State to track the selected rating with an optional initial value or default to 0

  // Function to handle setting the rating
  const handleSetRating = (rating: number) => {
    setSelected(rating); // Update the selected state
    onRatingSelected(rating); // Communicate selection to parent
  };

  const Star = ({ index }: { index: number }) => (
    <svg
      onClick={() => handleSetRating(index)}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(selected)} // Keep the fill of selected rating on mouse leave
      width="50" // Adjust width as needed
      height="48" // Adjust height to match the actual size of the stars
      viewBox="0 0 25 24" // Adjust viewBox to properly fit a single star
      xmlns="http://www.w3.org/2000/svg"
      style={{
        cursor: "pointer",
        fill: index <= (hovered || selected) ? "#f59e0b" : "none", // Color stars based on hovered or selected state
      }}
    >
      <path
        d="M12 .587l3.668 7.431 8.332 1.209-6.035 5.884 1.425 8.309-7.39-3.884-7.39 3.884 1.425-8.309-6.035-5.884 8.332-1.209L12 .587z"
        stroke="black"
        strokeWidth=".75"
      />
    </svg>
  );

  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} index={index} />
      ))}
    </div>
  );
};

export default InteractiveRatingBar;
