import folium
import json
from flight_paths import findAirportCoordinatesByIATACode
from main import getSpots

def plot_locations_on_map(data_path):
    spots = getSpots(data_path)

    iataCode = data_path[-7:-4] #get the iataCode from the dataPath
    coordinates = findAirportCoordinatesByIATACode(iataCode)
    # Create a map centered at an initial location
    m = folium.Map(location=coordinates, zoom_start=15)

    # Iterate through the list of data
    for spot in spots:
        try:
            # Parse the JSON data in each item
            location_data = json.loads(spot)

            # Extract latitude and longitude
            latitude = location_data.get('location', {}).get('latitude', None)
            longitude = location_data.get('location', {}).get('longitude', None)

            # Check if both latitude and longitude are available
            if latitude is not None and longitude is not None:
                # Create a marker at the specified location with a popup displaying the place name
                folium.Marker(
                    location=[latitude, longitude],
                    popup=f"Place Name: {location_data.get('displayName', {}).get('text', 'Unknown Place')}<br>Average Altitude: {location_data['averageAltitude']}<br>Distance from Flightpath: {location_data['distanceFromFlightpath']}"
                ).add_to(m)
        except json.JSONDecodeError:
            print(f"Skipping invalid JSON data: {spot}")

    # Display the map
    m.save('locations_map.html')
    print("Map saved as locations_map.html")


if __name__ == "__main__" : 
    data_path = 'flightData/flight_log_BOS.csv'
    plot_locations_on_map(data_path)
