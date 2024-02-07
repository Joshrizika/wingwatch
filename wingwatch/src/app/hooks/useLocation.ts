// If the file contains JSX, ensure the extension is .tsx. If not, .ts is appropriate.
import { useState, useEffect } from 'react';

// Define a type for the location state to allow latitude and longitude to be both number and null
type LocationState = {
  latitude: number | null;
  longitude: number | null;
};

const useLocation = () => {
  // Initialize state with explicit types for latitude and longitude
  const [location, setLocation] = useState<LocationState>({ latitude: null, longitude: null });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    };

    const handleError = () => {
      setError('Unable to retrieve your location');
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
  }, []);

  return { location, error };
};

export default useLocation;
