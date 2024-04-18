from datetime import datetime
import pandas as pd
import threading
import requests
import execjs
import shutil
import math
import time
import os

#This file collects flight data in a given area around the selected airport and saves it to a file.

#function: to get airport coordinates given the iataCode
#parameters: iataCode - string
#returns: tuple with latiutde and longitude
def findAirportCoordinatesByIATACode(iataCode): 
    with open('data/airport_data.js', 'r') as file: #open file with airport data
        js_code = file.read() #read the file

    ctx = execjs.compile(js_code) #compile the code at end of js file to get data
    airport_data = ctx.call('require', './data/airport_data') #require we have this data
    airport_data_df = pd.DataFrame(airport_data) #put data in a dataframe
    airport_data = airport_data_df.loc[airport_data_df["iata_code"] == iataCode] #get row with IATA code
    coordinates = airport_data["coordinates"].iloc[0] #isolate coordinates
    longitude, latitude = map(float, coordinates.split(', ')) #split lat and long
    return (latitude, longitude)

#function: to get airport elevation given the iataCode
#parameters: iataCode - string
#returns: elevation
def findAirportElevationByIATACode(iataCode): 
    with open('data/airport_data.js', 'r') as file: #open file with airport data
        js_code = file.read() #read the file

    ctx = execjs.compile(js_code) #compile the code at end of js file to get data
    airport_data = ctx.call('require', './data/airport_data') #require we have this data
    airport_data_df = pd.DataFrame(airport_data) #put data in a dataframe
    airport_data = airport_data_df.loc[airport_data_df["iata_code"] == iataCode] #get row with IATA code
    elevation = int(airport_data["elevation_ft"].iloc[0]) #isolate elevation
    return elevation #return eleveation

 
#function: to calculate a box around the given airport with each side's length being specified by boxDimensions, the airport will be at the center
#parameters: iataCode - string, boxDimensions - int
#returns: tuple with north, east, south, and west boundaries respectively
def calculateCoordinatesWithinDimensions(iataCode, boxDimensions):
    earthRadius = 3963.19 #radius of earth in miles
    angularDistance = boxDimensions / earthRadius #gets angular distance (in radians) covered by the desired box dimensions

    coordinates = findAirportCoordinatesByIATACode(iataCode) #get the coordinates of the airport
    latitude = coordinates[0] #get latitude
    longitude = coordinates[1] #get longitude

    latitudeRadians = latitude * (math.pi / 180) #get latitude expressed in radians

    latitudeNorth = latitude + (angularDistance * (180 / math.pi)) #get the northern latitude
    latitudeSouth = latitude - (angularDistance * (180 / math.pi)) #get the southern latitude
    longitudeWest = longitude - (angularDistance * (180 / math.pi) / math.cos(latitudeRadians)) #get the western longitude
    longitudeEast = longitude + (angularDistance * (180 / math.pi) / math.cos(latitudeRadians)) #get the eastern longitude

    return (latitudeNorth, longitudeEast, latitudeSouth, longitudeWest) #reurn the bounds going clockwise starting at north

#function: gets the haversine distance between two points
#parameters: lat1 - float, long1 - float, lat2 - float, long2 - float
#returns: distance between points in miles
def haversine(lat1, long1, lat2, long2):
    earth_radius_miles = 3958.8 #set earth radius

    lat1, long1, lat2, long2 = map(math.radians, [lat1, long1, lat2, long2]) #convert latitude and longitude from degrees to radians

    # Haversine formula
    dlat = lat2 - lat1 #difference in latitude
    dlong = long2 - long1 #distance in longitude
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlong/2)**2 #intermediate value representing the square of half the angular separation
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)) #intermediate value representing the central angle
    distance = earth_radius_miles * c #multiply by earth radius in miles

    return distance

#function: to return flight information for flights coming and going from "iataCode"
#parameters: iataCode - string
#returns: a list of flights
def getFlights(iataCode):
    boxDimensions = 30 #set the dimensions of the box that bounds the results
    boundsBox = calculateCoordinatesWithinDimensions(iataCode, boxDimensions) #get the bounding box coordinates
    params_depart = { #set the parameters for the first api request
        'api_key': '5d73a0fa-3d4f-4380-a0c7-699b22a6834a', #api key
        'bbox': f'{boundsBox[2]}, {boundsBox[3]}, {boundsBox[0]}, {boundsBox[1]}', #bounding box
        'dep_iata': iataCode, #departing airport iata code
        '_fields': 'flight_icao, airline_icao, lat, lng, alt, dep_iata, arr_iata, status' #return values
    }

    params_arrive = { #set the parameters for the second api request
        'api_key': '5d73a0fa-3d4f-4380-a0c7-699b22a6834a', #api key
        'bbox': f'{boundsBox[2]}, {boundsBox[3]}, {boundsBox[0]}, {boundsBox[1]}', #bounding box
        'arr_iata': iataCode, #arriving airport iata code
        '_fields': 'flight_icao, airline_icao, lat, lng, alt, dep_iata, arr_iata, status' #return values
    }
    api_result_depart = requests.get('https://airlabs.co/api/v9/flights', params_depart) #first api call
    api_result_arrive = requests.get('https://airlabs.co/api/v9/flights', params_arrive) #second api call

    api_response_depart = api_result_depart.json()['response'] #get the response from the first api call
    api_response_arrive = api_result_arrive.json()['response'] #get the response from the second api call

    api_response = api_response_depart + api_response_arrive #concatenate the results together

    fields = ['flight_icao', 'airline_icao', 'lat', 'lng', 'alt', 'dep_iata', 'arr_iata', 'status']
    flights = [flight for flight in api_response if all(flight.get(field) is not None for field in fields)] #filter out all rows missing data
    for flight in flights: #for each flight
        flight['alt'] = round(flight['alt'] * 3.28084) #convert meters to feet
        flight['alt'] = flight['alt'] - findAirportElevationByIATACode(iataCode) #convert elevation to altitude
    airport_coords = findAirportCoordinatesByIATACode(iataCode)
    airborne_flights = [flight for flight in flights if flight['status'] == 'en-route' and flight['alt'] <= 4921 and flight['alt'] >= 0 and haversine(flight['lat'], flight['lng'], airport_coords[0], airport_coords[1]) >= 0.621371] #filter out all flights that are not en-route, that are below 0 feet and above 4921 feet, and that are greater than 1 km away from the airport

    timestamp = datetime.now() #get current time
    timestamped_airborne_flights = [{'timestamp': timestamp, **d} for d in airborne_flights] #add timestamp to each flight

    return timestamped_airborne_flights #return flights


#function: to call getFlights() every 10 seconds and add the results to a file 
#parameters: iataCode - string
#returns: nothing
def trackFlights(iataCode):
    log_file_name = f"data/flightData/data/flight_log_{iataCode}.csv" #create a new file name
    file_exists = os.path.isfile(log_file_name) #check if file exists already

    max_line_count = 5000 #set maximum line count
    
    if not file_exists: #if the file does not exist then create it
        try:
            with open(log_file_name, 'w') as log_file: #create the file
                line_count = 0 #set initial line count to 0
                include_headers = True
        except IOError as e: #check for errors
            print(f"Error creating the file: {e}")
    else: #if the file does exist
        with open(log_file_name, 'r') as log_file: #open the file
            include_headers = False
            line_count = sum(1 for line in log_file) #and count the lines


    while line_count < max_line_count: #loop until program is terminated
        flight_info = getFlights(iataCode) #get the flights
        new_flight_data_df = pd.DataFrame(flight_info) #add them to a pandas dataframe
        with open(log_file_name, 'a') as log_file: #open the file
            new_flight_data_df.to_csv(log_file, header=include_headers, index=False) #add the new dataframe to the file
            line_count += len(new_flight_data_df) #add new lines to line count
            include_headers = False

        file_exists = False
        # time.sleep(10) #wait 10 seconds then repeat

    destination_dir = '../wingwatch/src/server/api/opt/flightDataStore' #set the destination directory
    shutil.copy(log_file_name, destination_dir) #copy the file to the destination directory

#function: collects data on all inputted airports simultaneously
#parameters: iataCodes - list
#returns: nothing
def collectAirportData(iataCodes):
    threads = [] #initialize empty threads list
    for iataCode in iataCodes: #for each airport
        thread = threading.Thread(target=trackFlights, args=(iataCode,)) #initialize a thread to call trackFlights on the iataCode
        thread.start() #start the thread
        threads.append(thread) #append to list of threads
    
    for thread in threads: #for each thread
        thread.join() #make sure that the main program waits until thread is finished


if __name__ == "__main__":
    # iataCodes = ['SYD', 'MEL']
    iataCodes = ['CAI']
    collectAirportData(iataCodes)
    # trackFlights('DEL')