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
    if (placeName) {
      setSelectedPlace(placeName);
    }
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
    if (inputRef.current && !inputRef.current.contains(event.target as Node) && suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
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
      {selectedPlace && (
        <div
          style={{
            border: "1px solid #000",
            padding: "10px",
            fontWeight: "normal",
            position: "relative",
            zIndex: 2,
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
      )}
    </form>
  );
};

export default ExploreLocationSearch;
