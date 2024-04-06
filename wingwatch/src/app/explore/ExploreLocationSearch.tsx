import { useState, useEffect, useRef } from "react";

interface LocationSearchProps {
  onSearch: (query: string) => void;
  placeName?: string;
}

interface Place {
  placePrediction: {
    placeId: string;
    text: {
      text: string;
    };
  };
}

interface Suggestions {
  suggestions: Place[];
}

const ExploreLocationSearch: React.FC<LocationSearchProps> = ({
  onSearch,
  placeName,
}) => {
  const [currentInput, setCurrentInput] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedPlace(placeName ?? null);
  }, [placeName]);

  useEffect(() => {
    if (selectedPlace) {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("placeName", selectedPlace);
      window.history.pushState({}, "", "?" + urlParams.toString());
    }
  }, [selectedPlace]);

  useEffect(() => {
    let isCancelled = false;
    if (currentInput !== "") {
      fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        },
        body: JSON.stringify({
          input: currentInput,
        }),
      })
        .then((response) => response.json())
        .then((data: Suggestions) => {
          if (!isCancelled) {
            if (currentInput !== "") {
              setSuggestions(data?.suggestions || []);
              if (data?.suggestions) {
                setShowSuggestions(true);
              }
            } else {
              setSuggestions([]);
              setShowSuggestions(false);
              setActiveSuggestion(-1);
            }
          }
        })
        .catch((error) => {
          console.error("An error occurred:", error);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentInput]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const updatedInput = event.target.value;
    setCurrentInput(updatedInput);
  };

  const handleSelection = () => {
    if (suggestions[activeSuggestion]) {
      setSelectedPlace(
        suggestions[activeSuggestion]!.placePrediction.text.text,
      );
      onSearch(suggestions[activeSuggestion]!.placePrediction.placeId);
      setShowSuggestions(false);
      setCurrentInput(""); // Reset the currentInput to "" on submit
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set(
        "placeName",
        suggestions[activeSuggestion]!.placePrediction.text.text,
      );
      urlParams.set(
        "placeId",
        suggestions[activeSuggestion]!.placePrediction.placeId,
      );
      window.history.replaceState({}, "", "?" + urlParams.toString());
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSelection();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (activeSuggestion === -1) {
        return;
      }
      setActiveSuggestion(activeSuggestion - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (activeSuggestion + 1 >= suggestions.length) {
        return;
      }
      setActiveSuggestion(activeSuggestion + 1);
    }
  };

  const handleSuggestionHover = (index: number) => {
    setActiveSuggestion(index);
  };

  const handleClearSelection = () => {
    setSelectedPlace(null);
    setCurrentInput("");
    onSearch("");
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("placeName");
    urlParams.delete("placeId");
    window.history.replaceState({}, "", "?" + urlParams.toString());
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      inputRef.current &&
      !inputRef.current.contains(event.target as Node) &&
      suggestionsRef.current &&
      !suggestionsRef.current.contains(event.target as Node)
    ) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function segmentLongWords(selectedPlace: string): string {
    const words = selectedPlace.split(" ");
    const segmentedWords = words.map((word) => {
      if (word.length > 25) {
        // Insert `{-}` every 25 characters in the word
        let segmented = "";
        for (let i = 0; i < word.length; i += 25) {
          const segment = word.slice(i, i + 25);
          segmented += (i > 0 ? "-" : "") + segment;
        }
        return segmented;
      }
      return word;
    });

    return segmentedWords.join(" ");
  }

  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ width: "100%" }}>
        <form style={{ width: "100%" }}>
          <input
            type="text"
            value={currentInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search..."
            style={{
              fontWeight: "normal",
              zIndex: 5, // Ensure input is always on top
              outline: "1px solid #000",
              width: "100%",
              minWidth: "150px",
              boxSizing: "border-box",
              padding: "5px",
              borderRadius: "4px",
            }}
            ref={inputRef}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                zIndex: 4, // Ensure suggestions are directly below the search bar and on top of the selected place
                border: "1px solid gray",
                width: "98%",
                boxSizing: "border-box",
                overflow: "hidden",
                backgroundColor: "#fff",
                left: "1%",
                marginTop: "1px", // Adds a one pixel gap between the suggestions and the bottom of the search box
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
              }}
              ref={suggestionsRef}
            >
              <ul style={{ padding: 0, margin: 0 }}>
                {suggestions.map((place, index) => (
                  <li
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelection();
                    }}
                    onMouseOver={() => handleSuggestionHover(index)}
                    style={{
                      backgroundColor:
                        index === activeSuggestion ? "#eee" : "#fff",
                      fontWeight: "normal",
                      listStyleType: "none",
                      padding: "5px",
                      whiteSpace: "normal",
                      wordWrap: "break-word",
                      fontSize: "14px",
                    }}
                  >
                    {place?.placePrediction?.text?.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectedPlace && (
            <div
              style={{
                border: "1px solid gray",
                padding: "10px",
                fontWeight: "normal",
                marginTop: "5px",
                fontSize: "12px",
                borderRadius: "4px",
                minHeight: "30px",
                height: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                zIndex: 3, // Lower than suggestions to be obscured when suggestions are shown
                wordWrap: "break-word",
                hyphens: "auto",
                overflowWrap: "break-word", // Ensure text breaks to prevent width expansion
              }}
            >
              {segmentLongWords(selectedPlace)}
              <button
                type="button"
                onClick={handleClearSelection}
                style={{
                  fontSize: "12px",
                  padding: "0 5px",
                }}
              >
                X
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ExploreLocationSearch;
