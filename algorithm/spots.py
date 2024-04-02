from flight_paths import findAirportCoordinatesByIATACode
from scipy.spatial.distance import euclidean
from scipy.interpolate import interp1d
from scipy.optimize import minimize
import cartopy.feature as cfeature
from scipy.integrate import quad
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import pandas as pd
import numpy as np
import requests
import math
import json

#This file is used to get the spots around the flight path.

#function: converts distance_degrees into miles based on the position given
#parameters: lat - float, long - float, distance_degrees - float
#returns: distance in miles
def degrees_to_miles(lat, long, distance_degrees):
    lat1 = math.radians(lat) #convert lat to radians
    long1 = math.radians(long) #convert long to radians
    lat2 = math.radians(lat) #convert lat to radians
    long2 = math.radians(long + distance_degrees) #convert long + distance_degrees to radians

    earth_radius_miles = 3958.8 #set the earths radius

    dlong = long2 - long1 #find the difference between the longitudes
    dlat = lat2 - lat1 #find the difference between the latitudes
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlong / 2)**2 #intermediate value representing the square of half the angular separation
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)) #intermediate value representing the central angle
    distance_miles = earth_radius_miles * c #get the distance in miles
    return distance_miles

#function: converts distance_miles into degrees based on the latitude given
#parameters: distance_miles - float, latitude - float
#returns: distance in degrees
def miles_to_degrees(distance_miles, latitude):
    earth_radius_miles = 3958.8 #earth's radius in miles
    circumference_at_latitude = 2 * math.pi * earth_radius_miles * math.cos(math.radians(latitude)) #calculate circumference of earth at latitude
    distance_degrees = (distance_miles / circumference_at_latitude) * 360.0 #calculate degrees
    return distance_degrees #return degrees

#function: gets distance between point and point on polynomial line at x
#parameters: x - float, point - tuple, coefficients - list
#returns: distance in degrees
def point_to_polynomial_distance(x, point, coefficients):
    x_val = x[0] if np.ndim(x) > 0 else x #if x is in a list then get it at index 0
    poly_lat = np.polyval(coefficients, x_val) #get the equivalent latitude for x along line
    distance = euclidean((poly_lat, x_val), (point[0], point[1])) #calculate euclidean distance
    return distance #return distance

#function: finds the shortest distance between a point and a polynomial line
#parameters: point - tuple, line - dict
#returns: minimum distance in miles
def pointLineDistance(point, line):
    coefficients = line['coefficients'] #get coefficients
    min_long = line['min_long'] #get minimum longitude
    max_long = line['max_long'] #get maximum longitude
    bounds = [(min_long, max_long)] #define bounds
    x0 = [np.mean([min_long, max_long])] #get intial x-value at midpoint

    result = minimize( #use minimize function to find smallest distance
    point_to_polynomial_distance, #call point_to_polynomial_distance
    x0, #set initial x
    args=(point, coefficients), #set point and coefficients as arguments
    bounds=bounds, #set bounds
    method='trust-constr',  #set method
)
    if result.success: #if minimize function was successful
        closest_lon = result.x[0] #get the closest longitude
        closest_lat = np.polyval(coefficients, closest_lon) #use line to calculate equivalent latitude
        closest_point_on_curve = (closest_lat, closest_lon) #set tuple with coordinate pair
        min_distance = euclidean(closest_point_on_curve, point) #calculate the euclidean distance between point and closest point
        min_distance_miles = degrees_to_miles(closest_lat, closest_lon, min_distance) #convert distance to miles
        return min_distance_miles #return distance
    else: #if minimize function was not successful
        # Print out debugging information
        print("Optimization failed:")
        print("Message:", result.message)
        print("Status Code:", result.status)
        print("Number of Iterations:", result.nit)
        print("Number of Function Evaluations:", result.nfev)
        print("Last Function Evaluation Value:", result.fun)
        print("Last x Value:", result.x)
        raise ValueError("Optimization failed. Please check the input data and try again.") #call error

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

#function: gets the average altitude of planes in radius from point
#parameters: point - tuple, cluster_df - DataFrame, radius_miles - float
#returns: average altitude
def getAverageAltitude(point, cluster_df, radius_miles):
    lat, long = point #set lat and long
    average_altitude = float("nan")
    while np.isnan(average_altitude):
        filtered_cluster_df = cluster_df[cluster_df.apply(lambda row: haversine(lat, long, row['lat'], row['lng']) <= radius_miles, axis=1)] #filter out all datapoints outside radius
        filtered_cluster_df['alt'] = pd.to_numeric(filtered_cluster_df['alt'], errors='coerce')
        average_altitude = filtered_cluster_df['alt'].mean() #calculate average altitude
        radius_miles+=0.1
    return average_altitude #return average altitude

def getDistanceFromAirport(spot_coords, iataCode):
    airport_coords = findAirportCoordinatesByIATACode(iataCode)
    distance = haversine(spot_coords[0], spot_coords[1], airport_coords[0], airport_coords[1])
    return distance

#function: calculates the derivative of a polynomial and gets the value at x
#parameters: x - float, coefficients - list
#returns: value of derivative polynomial at x
def derivative(x, coefficients):
    p = np.poly1d(coefficients) #assert that coefficients are in 1d
    return np.polyder(p)(x) #return value of derivative polynomial at x

#function: calculates infinitesmial element of arc length for polynomial line at point x
#parameters: x - float, coefficients - list
#returns: value of arc length differential
def arcLengthElement(x, coefficients):
    return np.sqrt(1 + derivative(x, coefficients)**2) #return arc length differential

#function: generates points interval distance apart along polynomial line
#parameters: coefficients - list, start_x - float, end_x - float, interval - float
#returns: list of points
def generatePoints(coefficients, start_x, end_x, interval):
    x_range = np.linspace(start_x, end_x, 1000) #calculate the arc lengths for a range of x-values
    arc_lengths = [quad(arcLengthElement, start_x, x, args=(coefficients))[0] for x in x_range] #generate list of arc lengths
    
    arc_length_to_x = interp1d(arc_lengths, x_range) #create an interpolation function based on the calculated arc lengths
    
    x_values = [start_x] #initialize x-values list
    current_arc_length = 0 #set initial arc length to 0
    
    #find each x-value at the specified interval along the curve
    while current_arc_length < arc_lengths[-1]: #while current arc length is less than the total arc length
        current_arc_length += interval #increase current arc length by the interval
        if current_arc_length >= arc_lengths[-1]: #if current arc length is greater than the total arc length
            break #break out of while loop
        next_x = arc_length_to_x(current_arc_length) #calculate next value of x
        x_values.append(next_x) #append x-value to x-values list
        
    points = [(float(np.polyval(coefficients, x)), float(x)) for x in x_values] #evaluate polynomial line at each x-value for corresponding y-values

    return points #return points

#function: display the points along the line on a map
#parameters: points - list
#returns: nothing
def displayLinePointData(points):
    fig = plt.figure(figsize=(10, 5)) #create new figure

    ax = fig.add_subplot(1, 1, 1, projection=ccrs.Mercator()) #add mercador projection subplot

    zoom = 0.5 #set zoom
    min_long = min(point[1] for point in points) - zoom #get minimum longitude
    max_long = max(point[1] for point in points) + zoom #get maximum longitude
    min_lat = min(point[0] for point in points) - zoom #get minimum latitude
    max_lat = max(point[0] for point in points) + zoom #get maximum latitude
    
    ax.set_extent([min_long, max_long, min_lat, max_lat], crs=ccrs.Geodetic()) #set bounds of map

    ax.coastlines(resolution='10m') #add coastlines
    ax.add_feature(cfeature.BORDERS, linestyle=':') #add borders
    ax.add_feature(cfeature.LAND, edgecolor='black') #add land
    ax.add_feature(cfeature.OCEAN) #add ocean
    ax.add_feature(cfeature.LAKES, edgecolor='black') #add lakes
    ax.add_feature(cfeature.RIVERS) #add river

    for point in points: #for each point
        plt.plot(point[1], point[0], 'ro', markersize=5, transform=ccrs.Geodetic()) #plot point on map

    plt.show() #show plot


#function: takes a line and gets all the parks around it
#parameters: line - dictionary
#returns: a list of parks
def getParks(line):
    search_distance_miles = 0.3 #distance from the line we will search for parks in miles
    search_distance_meters = search_distance_miles * 1609.34 #convert it to meters
    points = generatePoints(line['coefficients'], line['min_long'], line['max_long'], miles_to_degrees(search_distance_miles, line['min_lat'])) #generate points along line
    # displayLinePointData(points) #display point data

    unique_spots = set() #create empty set of spots

    headers = { #set headers
        'Content-Type': 'application/json', #content type JSON
        'X-Goog-Api-Key': 'AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts', #api key
        'X-Goog-FieldMask': 'places.formattedAddress,places.location,places.googleMapsUri,places.displayName,places.editorialSummary' #expected fields
    }

    for point in points: #for each point
        json_data = { #set JSON data
            'includedTypes': [
                'park', #get all parks
            ],
            'maxResultCount': 20, #20 max results
            'locationRestriction': {
                'circle': {
                    'center': { #search in the area around point
                        'latitude': point[0], #set latitude
                        'longitude': point[1], #set longitude
                    },
                    'radius': search_distance_meters, #with a radius of search_distance_meters
                },
            },
        }


        response = requests.post('https://places.googleapis.com/v1/places:searchNearby', headers=headers, json=json_data) #api call
        if response.status_code == 200: #if api call was successfull
            data = json.loads(response.text) #get the data
            if 'places' in data: #if data was returned
                places = data['places'] #get the places
                for place in places: #for each place
                    point = (place['location']['latitude'], place['location']['longitude']) #get coordinates
                    distance_from_line = pointLineDistance(point, line)
                    if distance_from_line <= search_distance_miles: #if point is less than search_distance_miles distance away
                        place['airport'] = str(line['cluster']['airport'].iloc[0])
                        place['distanceFromFlightpath'] = distance_from_line #add the distance_from_line to the object
                        place['averageAltitude'] = getAverageAltitude(point, line['cluster'], search_distance_miles) 
                        place_coords = (place['location']['latitude'], place['location']['longitude'])
                        place['distanceFromAirport'] = getDistanceFromAirport(place_coords, place['airport'])
                        unique_spots.add(json.dumps(place)) #add spot to unique spots
        else: #if api call was not successfull
            print("Error: API call failed")
            print(response.text)
    spots = list(unique_spots) #turn unique spots into list
    # print(spots)
    return spots #return spots

if __name__ == "__main__" : 
    # line = {'coefficients': [
    #                         -9.22938759e-38,  4.52344752e-36,  5.70188403e-35, -5.79837247e-32,
    #                         1.07988142e-29, -1.50839844e-27,  1.80310851e-25, -1.88840821e-23,
    #                         1.67769043e-21, -1.07913069e-19,  6.90380855e-20,  1.59935028e-15,
    #                         -3.74281769e-13,  6.31994481e-11, -9.04520499e-09,  1.13394089e-06,
    #                         -1.21667264e-04,  9.80017965e-03, -1.48811402e-01, -1.70155669e+02,
    #                         5.21074952e+04], 
    #         'max_lat': 37.70220373244956, 
    #         'max_long': -122.248742, 
    #         'min_lat': 37.63234887950239, 
    #         'min_long': -122.370055}
    
    line = {'coefficients': [
                            -3.03918804e-30, -7.01339284e-32, 9.51372530e-27, -9.77640864e-25,
                            6.81489730e-23, -3.46681640e-21, 8.53900410e-20, 7.63965073e-18,
                            -1.50905591e-15, 1.63105937e-13, -1.38283618e-11, 9.68917112e-10,
                            -5.32328856e-08, 1.59605029e-06, 1.07270076e-04, -2.57685970e-02,
                            3.00784756e+00, -2.56326012e+02, 1.48160608e+04, 6.86667340e+02,
                            -1.67431174e+08
                            ],
            'max_lat': 38.98708, 
            'max_long': -77.039417, 
            'min_lat': 38.867844, 
            'min_long': -77.17926}
    
    spots = getParks(line)
    print(spots)


