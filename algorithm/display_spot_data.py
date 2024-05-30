from flight_paths import findAirportCoordinatesByIATACode
from main import getSpots
import folium
import json

#This file is used to display our resulting spot data on a map.

#function: calls getSpots on data_path and then plots spots on a map
#parameters: iataCode - string
#returns: nothing
def plot_locations_on_map(iataCode):
    spots = getSpots(iataCode) #get the spots with the data

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
                    popup=f"Place Name: {location_data.get('displayName', {}).get('text', 'Unknown Place')}<br>Average Altitude: {location_data['averageAltitude']}<br>Distance from Flightpath: {location_data['distanceFromFlightpath']}<br>Distance from Airport: {location_data['distanceFromAirport']}" #with marker for name average altitude and distance from flightpath
                ).add_to(m) #add it to the map
        except json.JSONDecodeError: #skip any invalid data
            print(f"Skipping invalid JSON data: {spot}")

    m.save(f'data/spotData/maps/spot_map_{iataCode}.html') #save the map
    print(f"Map saved as data/spotData/maps/spot_map_{iataCode}.html")


if __name__ == "__main__" : 
    plot_locations_on_map("SAN")

