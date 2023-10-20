import folium
import pandas as pd

data = pd.read_csv("flightData/flight_log_BOS_10-20-23_12:10-13:10.csv", parse_dates=['timestamp'])

map = folium.Map(location=[42.3601, -71.0589], zoom_start=8)

for index, row in data.iterrows():
    tooltip_text = f"Timestamp: {row['timestamp']}<br>"
    tooltip_text += f"Flight ICAO: {row['flight_icao']}<br>"
    tooltip_text += f"Altitude: {row['alt']}<br>"
    tooltip_text += f"Departure IATA: {row['dep_iata']}<br>"
    tooltip_text += f"Arrival IATA: {row['arr_iata']}<br>"
    folium.Marker([row['lat'], row['lng']], tooltip=tooltip_text).add_to(map)
    
map.save('map_boston.html')