from flight_paths import findAirportCoordinatesByIATACode
import pandas as pd
import folium

#function: to display all the points recorded in the collected data
#parameters: data_path - string
#returns: nothing
def displayData(iataCode):
    data_path = f"flightData/data/flight_log_{iataCode}.csv"

    data = pd.read_csv(data_path, parse_dates=['timestamp']) #create a dataframe using the data and set the dates to datetime type

    map = folium.Map(location=list(findAirportCoordinatesByIATACode(iataCode)), zoom_start=8) #create the map with the airport at the center

    for index, row in data.iterrows(): #for each marker add the data below
        tooltip_text = f"Timestamp: {row['timestamp']}<br>"
        tooltip_text += f"Flight ICAO: {row['flight_icao']}<br>"
        tooltip_text += f"Latitude: {row['lat']}<br>"
        tooltip_text += f"Longitude: {row['lng']}<br>"
        tooltip_text += f"Altitude: {row['alt']}<br>"
        tooltip_text += f"Departure IATA: {row['dep_iata']}<br>"
        tooltip_text += f"Arrival IATA: {row['arr_iata']}<br>"
        folium.Marker([row['lat'], row['lng']], tooltip=tooltip_text).add_to(map) #add the marker to the map
        
    map.save(f'flightData/maps/map_{iataCode}.html') #save the map


if __name__ == "__main__":
    displayData("BOS")