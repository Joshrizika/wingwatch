from clusters import getPaths
from spots import getParks
import pandas as pd
import json

#This file runs the clustering and spot finding algorithms and returns the data to a csv.

#function: takes data from data_path, gets paths from data, finds parks along paths, and saves data to csv
#parameters: iataCode - string
#returns: nothing
def getSpots(iataCode):
    spots = set() #create empty set
    flight_path_lines = getPaths(iataCode) #get flight paths
    for line in flight_path_lines: #for each flight path
        spots.update(getParks(line)) #get parks and add them to spots set
    spots = list(spots) #turn spots into a list

    spots_data = [json.loads(spot) for spot in spots] #parse the JSON data
    df = pd.json_normalize(spots_data) #create a DataFrame from the JSON data
    df.rename(columns={'displayName.text': 'displayName', 'editorialSummary.text': 'editorialSummary', 'location.latitude': 'latitude', 'location.longitude': 'longitude'}, inplace=True) #rename columns
    df.drop(columns=['displayName.languageCode', 'editorialSummary.languageCode'], inplace=True) #remove columns
    df.to_csv(f'data/spotData/data/spots_{iataCode}.csv', index=False) #save data to .csv file

if __name__ == '__main__':
    getSpots("BOS")

   
