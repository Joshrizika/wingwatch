import Loading from "../_components/Loading";

interface GoogleMapsImage {
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
}

import Image from "next/image";

export default function ImageDisplay({
  googleMapsImages,
}: {
  googleMapsImages: GoogleMapsImage[];
}) {
  console.log(googleMapsImages);
  return (
    <div
      style={{
        display: "flex",
        overflowX: "auto",
        overflowY: "hidden",
        flexWrap: "nowrap",
        alignItems: "stretch",
        border: "2px solid lightgray",
        borderRadius: "8px",
        padding: "10px",
      }}
    >
      {googleMapsImages === null ? (
        <div
          style={{
            height: "400px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          No Images Available
        </div>
      ) : googleMapsImages.length === 0 ? (
        <div
          style={{
            height: "400px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <Loading />
        </div>
      ) : (
        googleMapsImages.map((image, index) => {
          let scaledHeight = image.heightPx;
          let scaledWidth = image.widthPx;
          if (image.heightPx > 4800 || image.widthPx > 4800) {
            const scalingFactor = Math.min(
              4800 / image.heightPx,
              4800 / image.widthPx,
            );
            scaledHeight = Math.min(Math.round(image.heightPx * scalingFactor), 4800);
            scaledWidth = Math.min(Math.round(image.widthPx * scalingFactor), 4800);
            console.log(`${index}: https://places.googleapis.com/v1/${image.name}/media?maxHeightPx=${scaledHeight}&maxWidthPx=${scaledWidth}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
          }
          return (
            <div
              key={index}
              style={{
                flex: "0 0 auto",
                marginRight: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "400px",
                width: "auto",
                backgroundColor: "#f0f0f0", // Added gray background
              }}
            >
              <Image
                src={`https://places.googleapis.com/v1/${image.name}/media?maxHeightPx=${scaledHeight}&maxWidthPx=${scaledWidth}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                alt={`Google Maps Image ${index}`}
                height={400}
                width={400 * (scaledWidth / scaledHeight)}
                priority={index === 0}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
