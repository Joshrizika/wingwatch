import pandas as pd
import execjs
import math
import requests
from datetime import datetime
import time
import os


with open('airport_data.js', 'r') as file:
    js_code = file.read()

ctx = execjs.compile(js_code)
airport_data = ctx.call('require', './airport_data')

airport_data_df = pd.DataFrame(airport_data)


#function: to get airport coordinates given the location
#parameters: iataCode - string
#returns: tuple with latiutde and longitude
def findAirportCoordinatesByIATACode(iataCode): 
    airport_data = airport_data_df.loc[airport_data_df["iata_code"] == iataCode] #get row with IATA code
    coordinates = airport_data["coordinates"].iloc[0] #isolate coordinates
    longitude, latitude = map(float, coordinates.split(', ')) #split lat and long
    return (latitude, longitude)

 
#function: to calculate a box around the given airport with each side's length being specified by boxDimensions, the airport will be at the center
#parameters: iataCode - string, boxDimensions - int
#returns: tuple with north, east, south, and west boundaries respectively
def calculateCoordinateswithin50Miles(iataCode, boxDimensions):
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


#function: to return flight information for flights coming and going from "iataCode"
#parameters: iataCode - string
#returns: a list of flights
def getFlights(iataCode):
    boxDimensions = 30 #set the dimensions of the box that bounds the results
    boundsBox = calculateCoordinateswithin50Miles(iataCode, boxDimensions) #get the bounding box coordinates
    params_depart = { #set the parameters for the first api request
        'api_key': 'ed9f2aab-ab95-4805-9da8-b43eaf96a836', #api key
        'bbox': f'{boundsBox[2]}, {boundsBox[3]}, {boundsBox[0]}, {boundsBox[1]}', #bounding box
        'dep_iata': iataCode, #departing airport iata code
    }

    params_arrive = { #set the parameters for the second api request
        'api_key': 'ed9f2aab-ab95-4805-9da8-b43eaf96a836', #api key
        'bbox': f'{boundsBox[2]}, {boundsBox[3]}, {boundsBox[0]}, {boundsBox[1]}', #bounding box
        'arr_iata': iataCode, #arriving airport iata code
    }
    api_result_depart = requests.get('https://airlabs.co/api/v9/flights', params_depart) #first api call
    api_result_arrive = requests.get('https://airlabs.co/api/v9/flights', params_arrive) #second api call

    

    api_response_depart = api_result_depart.json()['response'] #get the response from the first api call
    api_response_arrive = api_result_arrive.json()['response'] #get the response from the second api call

    api_response = api_response_depart + api_response_arrive #concatenate the results together

    airborne_flights = [flight for flight in api_response if flight['status'] == 'en-route' and flight['alt'] <= 1500] #filter out all flights that are not en-route and that are below 1500 feet

    timestamp = datetime.now() #get current time
    timestamped_airborne_flights = [{'timestamp': timestamp, **d} for d in airborne_flights] #add timestamp to each flight

    return timestamped_airborne_flights #return flights


#function: to call getFlights() every 10 seconds and add the results to a file 
#parameters: iataCode - string
#returns: nothing
def trackFlights(iataCode):
    log_file_name = f"flight_log_{iataCode}.csv" #create a new file name
    file_exists = os.path.isfile(log_file_name) #check if file exists already
    
    if(not file_exists): #if the file does not exist then create it
        try:
            with open(log_file_name, 'w') as log_file: #create the file
                pass
        except IOError as e: #check for errors
            print(f"Error creating the file: {e}")

    include_headers = not file_exists #if the file doesnt exist then i should include headers
    while True: #loop until program is terminated
        flight_info = getFlights(iataCode) #get the flights
        new_flight_data_df = pd.DataFrame(flight_info) #add them to a pandas dataframe
        with open(log_file_name, 'a') as log_file: #open the file
            new_flight_data_df.to_csv(log_file, header=include_headers, index=False) #add the new dataframe to the file

        file_exists = False
        time.sleep(10) #wait 10 seconds then repeat

trackFlights("DCA")

