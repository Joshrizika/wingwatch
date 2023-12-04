from clusters import getPaths
from spots import getParks
import pandas as pd
import json

#This file runs the clustering and spot finding algorithms.

#function: takes data from data_path, gets paths from data and finds parks along them
#parameters: line - dictionary
#returns: a list of parks
def getSpots(iataCode):
    spots = set() #create empty set
    flight_path_lines = getPaths(iataCode) #get flight paths
    for line in flight_path_lines: #for each flight path
        spots.update(getParks(line)) #get parks and add them to spots set
    spots = list(spots) #turn spots into a list

    # Convert each JSON string in the list to a dictionary
    spots_data = [json.loads(spot) for spot in spots]

    # Normalize nested JSON data and create DataFrame
    df = pd.json_normalize(spots_data)

   # Rename column 'displayName.text' to 'displayName'
    df.rename(columns={'displayName.text': 'displayName', 'editorialSummary.text': 'editorialSummary', 'location.latitude': 'latitude', 'location.longitude': 'longitude'}, inplace=True)

    # Remove the column 'displayName.languageCode'
    df.drop(columns=['displayName.languageCode', 'editorialSummary.languageCode'], inplace=True)

    # Save the DataFrame to a CSV file
    df.to_csv(f'data/spotData/data/spots_{iataCode}.csv', index=False)

if __name__ == '__main__':
    getSpots("BOS")

   
