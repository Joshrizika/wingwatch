from clusters import getPaths
from spots import getParks
import pandas as pd
import threading
import json
import csv
import os

#This file runs the clustering and spot finding algorithms and returns the data to a csv.

#function: saves flight path data to a csv
#parameters: flight_path - dictionary, iataCode - string, line_index - int
#returns: nothing
def savePath(flight_path, iataCode, line_index):
    path_csv = f"data/pathData/paths_{iataCode}.csv" #path to the CSV file
    line_id = iataCode + str(line_index) #create a unique id for the flight path
    
    file_mode = 'w' if line_index == 0 else 'a' #determine the file mode based on whether the file is being written for the first time or cleared
    
    with open(path_csv, mode=file_mode, newline='') as file: #open the file in the determined mode
        writer = csv.writer(file) #create a writer
        
        if line_index == 0: #if the file is being written for the first time
            writer.writerow(['path_id', 'coefficients', 'max_lat', 'max_long', 'min_lat', 'min_long']) #write the header row
        
        coefficients = flight_path['coefficients'] #get coefficients
        max_lat = flight_path['max_lat'] #get max latitude
        max_long = flight_path['max_long'] #get max longitude
        min_lat = flight_path['min_lat'] #get min latitude
        min_long = flight_path['min_long'] #get min longitude
        
        writer.writerow([line_id, coefficients, max_lat, max_long, min_lat, min_long]) #write the data to the file

#function: takes data from data_path, gets paths from data, finds parks along paths, and saves data to csv
#parameters: iataCode - string
#returns: a list of spots in JSON format
def getSpots(iataCode):
    spots = set() #create empty set
    flight_path_lines = getPaths(iataCode) #get flight paths
    line_index = 0
    for line in flight_path_lines: #for each flight path
        line_id = iataCode + str(line_index) #create a unique id for the flight path
        parks = getParks(line)
        modified_parks = []
        for park_str in parks:
            park = json.loads(park_str) # Parse the JSON string into a dictionary
            park['path_id'] = str(line_id)
            modified_parks.append(json.dumps(park)) # Convert the dictionary back into a JSON string if necessary
        spots.update(modified_parks)

        savePath(line, iataCode, line_index)
        line_index += 1
    spots = list(spots) #turn spots into a list

    spots_data = [json.loads(spot) for spot in spots] #parse the JSON data
    df = pd.json_normalize(spots_data) #create a DataFrame from the JSON data
    df.rename(columns={'displayName.text': 'displayName', 'editorialSummary.text': 'editorialSummary', 'location.latitude': 'latitude', 'location.longitude': 'longitude'}, inplace=True) #rename columns
    df.drop(columns=['displayName.languageCode', 'editorialSummary.languageCode'], inplace=True) #remove columns
    df.to_csv(f'data/spotData/data/spots_{iataCode}.csv', index=False) #save data to .csv file

    return spots

#function: finds spots for all inputted airports simultaneously
#parameters: iataCodes - list
#returns: nothing
def getSpotsThreading(iataCodes): #DISABLE ALL FOLIUM AND MATPLOTLIB PLOTS WHEN USING THIS FUNCTION
    threads = [] #initialize empty threads list
    for iataCode in iataCodes: #for each airport
        thread = threading.Thread(target=getSpots, args=(iataCode,)) #initialize a thread to call getSpots on the iataCode
        thread.start() #start the thread
        threads.append(thread) #append to list of threads

    for thread in threads: #for each thread
        thread.join() #make sure that the main program waits until thread is finished

if __name__ == '__main__':
    iataCodes = ['ATL', 'BOS', 'DCA', 'DEN', 'DFW', 'EWR', 'IAD', 'JFK', 'LAX', 'LGA', 'ORD', 'PHL']
    getSpotsThreading(iataCodes)
    # iataCode = 'BOS'
    # getSpots(iataCode)

   
