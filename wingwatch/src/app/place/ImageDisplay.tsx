import React, { useState } from "react";
import Image from "next/image";
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

export default function ImageDisplay({
  googleMapsImages,
}: {
  googleMapsImages: GoogleMapsImage[];
}) {
  const [popupVisible, setPopupVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openPopup = (index: number) => {
    setCurrentImageIndex(index);
    setPopupVisible(true);
  };

  const closePopup = () => {
    setPopupVisible(false);
  };

  const goToPreviousImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + googleMapsImages.length) % googleMapsImages.length,
    );
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % googleMapsImages.length);
  };

  return (
    <div>
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
          googleMapsImages.map((image, index) => (
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
                backgroundColor: "#f0f0f0",
                cursor: "pointer",
              }}
              onClick={() => openPopup(index)}
            >
              <Image
                src={`https://places.googleapis.com/v1/${image.name}/media?maxHeightPx=${image.heightPx}&maxWidthPx=${image.widthPx}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                alt={`Google Maps Image ${index}`}
                height={400}
                width={400 * (image.widthPx / image.heightPx)}
                priority={index === 0}
              />
            </div>
          ))
        )}
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
                width: `${600 * (googleMapsImages[currentImageIndex]!.widthPx / googleMapsImages[currentImageIndex]!.heightPx)}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {googleMapsImages[currentImageIndex] && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: "20px",
                      left: "20px",
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "rgba(0, 0, 0, 0.1)",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  >
                    {googleMapsImages[currentImageIndex]!.authorAttributions[0].uri ? (
                      <a
                        href={googleMapsImages[currentImageIndex]!.authorAttributions[0].uri}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Image
                          key={googleMapsImages[currentImageIndex]!.authorAttributions[0].photoUri}
                          src={`https:${googleMapsImages[currentImageIndex]!.authorAttributions[0].photoUri}`}
                          alt="Author's Photo"
                          width={40}
                          height={40}
                          style={{
                            borderRadius: "50%",
                            marginRight: "10px",
                          }}
                        />
                        <span
                          style={{
                            color: "#fff",
                          }}
                        >
                          {googleMapsImages[currentImageIndex]!.authorAttributions[0].displayName}
                        </span>
                      </a>
                    ) : (
                      <>
                        <Image
                          key={googleMapsImages[currentImageIndex]!.authorAttributions[0].photoUri}
                          src={`https:${googleMapsImages[currentImageIndex]!.authorAttributions[0].photoUri}`}
                          alt="Author's Photo"
                          width={40}
                          height={40}
                          style={{
                            borderRadius: "50%",
                            marginRight: "10px",
                          }}
                        />
                        <span
                          style={{
                            color: "#fff",
                          }}
                        >
                          {googleMapsImages[currentImageIndex]!.authorAttributions[0].displayName}
                        </span>
                      </>
                    )}
                  </div>
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
                    onClick={goToPreviousImage}
                  >
                    &lt;
                  </div>
                  <Image
                    key={currentImageIndex} // Add a unique key to trigger remount on index change
                    src={`https://places.googleapis.com/v1/${googleMapsImages[currentImageIndex]!.name}/media?maxHeightPx=${googleMapsImages[currentImageIndex]!.heightPx}&maxWidthPx=${googleMapsImages[currentImageIndex]!.widthPx}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                    alt={`Google Maps Image ${currentImageIndex}`}
                    height={600}
                    width={
                      600 *
                      (googleMapsImages[currentImageIndex]!.widthPx /
                        googleMapsImages[currentImageIndex]!.heightPx)
                    }
                  />
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
                    onClick={goToNextImage}
                  >
                    &gt;
                  </div>
                </>
              )}
              {!googleMapsImages[currentImageIndex] && (
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
    </div>
  );
}