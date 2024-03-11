import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const placeSearchQuery = api.main.findPlaceSearch.useQuery(
    { query: searchTerm },
    {
      enabled: !!searchTerm,
    },
  );
  const router = useRouter();
  const dropdownRef = useRef(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsDropdownVisible(true);
    setHighlightedIndex(-1); // Reset highlighted index on search change
  };

  const handleSelect = useCallback(async (id: string) => {
    router.push(`/place?id=${id}`);
    setIsDropdownVisible(false);
  }, [router]);

  const handleClickOutside = (e: MouseEvent) => {
    if (
      dropdownRef.current && !(dropdownRef.current as Element).contains(e.target as Node) &&
      inputRef.current && !(inputRef.current as Element).contains(e.target as Node)
    ) {
      setIsDropdownVisible(false);
    }
  };

  // Use useCallback to memoize handleKeyDown function
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isDropdownVisible) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault(); // Prevent page scrolling
        setHighlightedIndex((prevIndex) =>
          prevIndex < (placeSearchQuery.data?.length ?? 0) - 1 ? prevIndex + 1 : prevIndex,
        );
        break;
      case "ArrowUp":
        event.preventDefault(); // Prevent page scrolling
        setHighlightedIndex((prevIndex) => 
          prevIndex > 0 ? prevIndex - 1 : 0,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (highlightedIndex > -1) {
          const selectedId = placeSearchQuery.data![highlightedIndex]!.place_id;
          void handleSelect(selectedId);
        }
        break;
      default:
        break;
    }
  }, [isDropdownVisible, highlightedIndex, placeSearchQuery.data, handleSelect]); // Declare dependencies here

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]); // handleKeyDown is now memoized and won't change on every render

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={handleSearchChange}
        onClick={() => setIsDropdownVisible(true)}
      />
      {isDropdownVisible && placeSearchQuery.data && placeSearchQuery.data.length > 0 && (
        <ul
          style={{
            listStyleType: "none",
            margin: 0,
            padding: 0,
            border: "1px solid black",
            position: "absolute",
            width: "100%",
            zIndex: 1000,
            backgroundColor: "white",
          }}
        >
          {placeSearchQuery.data?.map((place, index) => (
            <li
              key={place.place_id}
              tabIndex={0}
              style={{
                border: "1px solid black",
                padding: "10px",
                backgroundColor:
                  highlightedIndex === index ? "#eee" : "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseLeave={() => setHighlightedIndex(-1)}
              onClick={() => handleSelect(place.place_id)}
            >
              {place.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
