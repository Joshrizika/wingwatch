from clusters import getPaths
from spots import getParks

#function: takes data from data_path, gets paths from data and finds parks along them
#parameters: line - dictionary
#returns: a list of parks
def getSpots(iataCode):
    spots = set()

    flight_path_lines = getPaths(iataCode)
    for line in flight_path_lines:
        spots.update(getParks(line))
    spots = list(spots)
    return spots

if __name__ == '__main__':
    spots = getSpots("BOS")
    print(spots)
    print(len(spots))


   
