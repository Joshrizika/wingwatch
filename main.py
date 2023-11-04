from clusters import getPaths
from spots import getParks

#function: takes data from data_path, gets paths from data and finds parks along them
#parameters: line - dictionary
#returns: a list of parks
def getSpots(data_path):
    spots = set()

    flight_path_lines = getPaths(data_path)
    for line in flight_path_lines:
        spots.update(getParks(line))
    spots = list(spots)
    return spots

if __name__ == '__main__':
    data_path = 'flightData/flight_log_BOS.csv'
    
    spots = getSpots(data_path)
    print(spots)
    print(len(spots))


   
