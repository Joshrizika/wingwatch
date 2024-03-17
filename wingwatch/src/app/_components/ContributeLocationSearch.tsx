import { useState, useEffect, useRef } from "react";

interface LocationSearchProps {
  onSearch: (placePrediction: PlaceInfo | null) => void;
}

interface PlaceInfo {
  displayName: {
    text: string;
  };
  formattedAddress: string;
  googleMapsUri: string;
  location: {
    latitude: number;
    longitude: number;
  };
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

const ContributeLocationSearch: React.FC<LocationSearchProps> = ({ onSearch }) => {
  const [currentInput, setCurrentInput] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;
    if (currentInput !== "") {
      fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": "AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts",
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

  const getPlaceDetails = (placeId: string): Promise<PlaceInfo | null> => {
    return new Promise((resolve, reject) => {
      if (placeId !== null) {
        fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": "AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts",
            "X-Goog-FieldMask": "*",
          },
        })
          .then((response) => response.json())
          .then((data: PlaceInfo) => {
            resolve(data);
          })
          .catch((error) => {
            console.error("Error:", error);
            reject(null);
          });
      } else {
        resolve(null);
      }
    });
  };

  const handleSelection = () => {
    if (suggestions[activeSuggestion]) {
      getPlaceDetails(suggestions[activeSuggestion]!.placePrediction.placeId)
        .then((placeInfo) => {
          onSearch(placeInfo);
          setShowSuggestions(false);
          setCurrentInput(""); // Reset the currentInput to "" on submit
        })
        .catch((error) => {
          console.error("Error:", error);
        });
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

  return (
    <form>
      <input
        type="text"
        value={currentInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Search..."
        style={{ fontWeight: "normal", zIndex: 3, outline: "1px solid #000" }}
        ref={inputRef}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{ position: "absolute", zIndex: 4, border: "1px solid #000" }}
          ref={suggestionsRef}
        >
          <ul>
            {suggestions.map((place, index) => (
              <li
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelection();
                }}
                onMouseOver={() => handleSuggestionHover(index)}
                style={{
                  backgroundColor: index === activeSuggestion ? "#eee" : "#fff",
                  fontWeight: "normal",
                }}
              >
                {place?.placePrediction?.text?.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
};

export default ContributeLocationSearch;
