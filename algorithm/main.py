from clusters import getPaths
from spots import getParks

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
    return spots

if __name__ == '__main__':
    spots = getSpots("BOS")
    print(spots)

   