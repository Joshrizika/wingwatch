const RatingBar = ({ rating }: { rating: number }) => {
  // Calculate the percentage of the bar that should be filled based on the rating
  const fillPercentage = (rating / 5) * 100;

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
            {/* Repeated star paths for clipping */}
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
          clipPath="url(#star-mask)"
        />
        {/* The fill level bar, adjust the fill color to match your design */}
        <rect
          width={`${fillPercentage}%`}
          height="100%"
          fill="#f59e0b"
          clipPath="url(#star-mask)"
        />
        {/* Draw stars with black outline */}
        <g stroke="black" strokeWidth="1" fill="none">
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
        </g>
      </svg>
    </div>
  );
};

export default RatingBar;
