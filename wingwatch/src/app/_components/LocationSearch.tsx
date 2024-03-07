import { useState, useEffect, useRef } from "react";

interface LocationSearchProps {
  onSearch: (query: string) => void;
  formattedAddress?: string; // Add this line
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

const LocationSearch: React.FC<LocationSearchProps> = ({
  onSearch,
  formattedAddress,
}) => {
  const [currentInput, setCurrentInput] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formattedAddress) {
      setSelectedPlace(formattedAddress);
    }
  }, [formattedAddress]);

  useEffect(() => {
    let isCancelled = false;
    if (currentInput !== "" && !selectedPlace) {
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
              setActiveSuggestion(0);
            }
          }
        })
        .catch((error) => {
          console.error("An error occurred:", error);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestion(0);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentInput, selectedPlace]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const updatedInput = event.target.value;
    setCurrentInput(updatedInput);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestions[activeSuggestion]) {
        setSelectedPlace(
          suggestions[activeSuggestion]!.placePrediction.text.text,
        );
        onSearch(suggestions[activeSuggestion]!.placePrediction.placeId);
        setShowSuggestions(false);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (activeSuggestion === 0) {
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

  const handleSuggestionClick = (index: number) => {
    if (suggestions[index]) {
      setActiveSuggestion(index);
      setSelectedPlace(suggestions[index]!.placePrediction.text.text);
      onSearch(suggestions[index]!.placePrediction.placeId);
    }
  };

  const handleClearSelection = () => {
    setSelectedPlace(null);
    setCurrentInput("");
    onSearch("");
  };

  return (
    <form>
      {selectedPlace ? (
        <div
          style={{
            border: "1px solid #000",
            padding: "10px",
            fontWeight: "normal",
            position: "relative",
          }}
        >
          {selectedPlace}
          <button
            type="button"
            onClick={handleClearSelection}
            style={{ position: "absolute", right: "10px" }}
          >
            X
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder="Search..."
          style={{ fontWeight: "normal", zIndex: 1 }}
          ref={inputRef}
        />
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{ position: "absolute", zIndex: 2 }}>
          <ul>
            {suggestions.map((place, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(index)}
                style={{
                  backgroundColor: index === activeSuggestion ? "#eee" : "#fff",
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

export default LocationSearch;
