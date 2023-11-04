import folium
import json
from flight_paths import findAirportCoordinatesByIATACode
from main import getSpots

#function: calls getSpots on data_path and then plots spots on a map
#parameters: data_path - string
#returns: creates a .html file with the map
def plot_locations_on_map(data_path):
    spots = getSpots(data_path) #get the spots with the data

    iataCode = data_path[-7:-4] #get the iataCode from the dataPath
    coordinates = findAirportCoordinatesByIATACode(iataCode) #get the coordinates of the airport

    m = folium.Map(location=coordinates, zoom_start=15) #create a map centered at an initial location


    for spot in spots: #for spot in spots
        try:
            location_data = json.loads(spot) #parse the JSON data

            latitude = location_data.get('location', {}).get('latitude', None) #get latitude
            longitude = location_data.get('location', {}).get('longitude', None) #get longitude

            if latitude is not None and longitude is not None: #check if both latitude and longitude are available
                folium.Marker( #create a marker
                    location=[latitude, longitude], #at specified location
                    popup=f"Place Name: {location_data.get('displayName', {}).get('text', 'Unknown Place')}<br>Average Altitude: {location_data['averageAltitude']}<br>Distance from Flightpath: {location_data['distanceFromFlightpath']}" #with marker for name average altitude and distance from flightpath
                ).add_to(m) #add it to the map
        except json.JSONDecodeError: #skip any invalid data
            print(f"Skipping invalid JSON data: {spot}")

    m.save(f'spotData/maps/spot_map_{iataCode}.html') #save the map
    print("Map saved as locations_map.html")


if __name__ == "__main__" : 
    data_path = 'flightData/flight_log_BOS.csv'
    plot_locations_on_map(data_path)
