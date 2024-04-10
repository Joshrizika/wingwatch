import React, { useState } from "react";
import Image from "next/image";
import Loading from "../_components/Loading";
interface ImageDisplayProps {
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

export default function ImageDisplay({
  images,
}: {
  images: ImageDisplayProps[];
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
      (prev) => (prev - 1 + images.length) % images.length,
    );
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
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
        {images === null ? (
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
        ) : images.length === 0 ? (
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
          images.map((image, index) => {
            let adjustedHeightPx = image.heightPx;
            let adjustedWidthPx = image.widthPx;

            if (image.heightPx > 4800 || image.widthPx > 4800) {
              const ratio = Math.min(4800 / image.heightPx, 4800 / image.widthPx);
              adjustedHeightPx = Math.round(image.heightPx * ratio);
              adjustedWidthPx = Math.round(image.widthPx * ratio);
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
                  backgroundColor: "#f0f0f0",
                  cursor: "pointer",
                }}
                onClick={() => openPopup(index)}
              >
                <Image
                  src={image.type === "GM" ? `https://places.googleapis.com/v1/${image.name}/media?maxHeightPx=${adjustedHeightPx}&maxWidthPx=${adjustedWidthPx}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` : image.name}
                  alt={`Image ${index}`}
                  height={400}
                  width={400 * (adjustedWidthPx / adjustedHeightPx)}
                  priority={index === 0}
                />
              </div>
            );
          })
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
                width: `${600 * (images[currentImageIndex]!.widthPx / images[currentImageIndex]!.heightPx)}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {images[currentImageIndex] && (
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
                    {images[currentImageIndex]!.authorAttributions[0].uri ? (
                      <a
                        href={images[currentImageIndex]!.authorAttributions[0].uri}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Image
                          key={images[currentImageIndex]!.authorAttributions[0].photoUri}
                          src={`${images[currentImageIndex]!.type === 'GM' ? 'https:' : ''}${images[currentImageIndex]!.authorAttributions[0].photoUri}`}
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
                          {images[currentImageIndex]!.authorAttributions[0].displayName}
                        </span>
                      </a>
                    ) : (
                      <>
                        <Image
                          key={images[currentImageIndex]!.authorAttributions[0].photoUri}
                          src={`${images[currentImageIndex]!.type === 'GM' ? 'https:' : ''}${images[currentImageIndex]!.authorAttributions[0].photoUri}`}
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
                          {images[currentImageIndex]!.authorAttributions[0].displayName}
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
                  {(() => {
                    const maxHeight = 4800;
                    const maxWidth = 4800;
                    let heightPx = images[currentImageIndex]!.heightPx;
                    let widthPx = images[currentImageIndex]!.widthPx;
                    const ratio = widthPx / heightPx;

                    if (heightPx > maxHeight || widthPx > maxWidth) {
                      if (ratio > 1) { // width is greater
                        widthPx = maxWidth;
                        heightPx = Math.round(widthPx / ratio);
                      } else {
                        heightPx = maxHeight;
                        widthPx = Math.round(heightPx * ratio);
                      }
                    }

                    return (
                      <Image
                        key={currentImageIndex} // Add a unique key to trigger remount on index change
                        src={images[currentImageIndex]!.type === "GM" ? `https://places.googleapis.com/v1/${images[currentImageIndex]!.name}/media?maxHeightPx=${heightPx}&maxWidthPx=${widthPx}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` : images[currentImageIndex]!.name}
                        alt={`Image ${currentImageIndex}`}
                        height={600}
                        width={
                          600 *
                          (widthPx / heightPx)
                        }
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
                    onClick={goToNextImage}
                  >
                    &gt;
                  </div>
                </>
              )}
              {!images[currentImageIndex] && (
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
