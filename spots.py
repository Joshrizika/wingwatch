import math
import requests
import json

#function: finds the minimum distance between a point and a line segment given A & B, the coordinates of each end of the line, and point E
#parameters: A - List, B - List, E - List
#returns: distance in degrees
def minDistance(A, B, E) : 

    # vector AB 
    AB = [None, None] 
    AB[0] = B[0] - A[0] 
    AB[1] = B[1] - A[1] 

    # vector BP 
    BE = [None, None]
    BE[0] = E[0] - B[0] 
    BE[1] = E[1] - B[1] 

    # vector AP 
    AE = [None, None]
    AE[0] = E[0] - A[0]
    AE[1] = E[1] - A[1] 

    # Variables to store dot product 

    # Calculating the dot product 
    AB_BE = AB[0] * BE[0] + AB[1] * BE[1] 
    AB_AE = AB[0] * AE[0] + AB[1] * AE[1] 

    # Minimum distance from 
    # point E to the line segment 
    reqAns = 0 

    # Case 1 
    if (AB_BE > 0) :

        # Finding the magnitude 
        y = E[1] - B[1] 
        x = E[0] - B[0] 
        reqAns = math.sqrt(x * x + y * y) 

    # Case 2 
    elif (AB_AE < 0) :
        y = E[1] - A[1] 
        x = E[0] - A[0] 
        reqAns = math.sqrt(x * x + y * y) 

    # Case 3 
    else:

        # Finding the perpendicular distance 
        x1 = AB[0] 
        y1 = AB[1] 
        x2 = AE[0] 
        y2 = AE[1] 
        mod = math.sqrt(x1 * x1 + y1 * y1) 
        reqAns = abs(x1 * y2 - y1 * x2) / mod 
    
    return reqAns 

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

#function: gets the endpoints of the line
#parameters: line - dictionary
#returns: tuple of coordinate pairs
def findLineEndpoints(line):
    #set variables
    slope = line['slope']
    intercept = line['intercept']
    max_lat = line['max_lat']
    max_long = line['max_long']
    min_lat = line['min_lat']
    min_long = line['min_long']
    
    lat1 = min_lat #set initial lat1
    long1 = (lat1 - intercept) / slope #set initial long1 to correspond with lat1
    
    lat2 = max_lat #set initial lat2
    long2 = (lat2 - intercept) / slope #set initial long2 to correspond with lat2
    
    if long1 < min_long: #if long1 is less than the min long
        long1 = min_long #set long1 to the min long
        lat1 = slope * long1 + intercept #adjust lat1 respectively
        
    if long2 < min_long: #if long2 is less than the min long
        long2 = min_long #set long2 to the min long
        lat2 = slope * long2 + intercept #adjust lat2 respectively
        
    if long1 > max_long: #if long1 is greater than the max long
        long1 = max_long #set long1 to the max long
        lat1 = slope * long1 + intercept #adjust lat1 respectively
        
    if long2 > max_long: #if long2 is greater than the max long
        long2 = max_long #set long2 to the max long
        lat2 = slope * long2 + intercept #adjust lat2 respectively
        
    return ([lat1, long1], [lat2, long2]) #return tuple of coordinate pairs

#function: gets the minimum distance between a point and a line
#parameters: point - tuple, line - dictionary
#returns: minimum distance in miles
def pointLineDistance(point, line):
    endpoint1, endpoint2 = findLineEndpoints(line) #calls findLineEndpoint function
    distance_degrees = minDistance(endpoint1, endpoint2, list(point)) #calls minDistance function
    distance_miles = degrees_to_miles(point[0], point[1], distance_degrees) # calls degrees_to_miles function
    return distance_miles #returns distance in miles

#function: generates points interval_miles distance from each other on the line given
#parameters: line - dictionary, interval_miles - float
#returns: a list of points
def generatePoints(line, interval_miles):
    endpoint1, endpoint2 = findLineEndpoints(line) #gets endpoints of line

    interval_degrees = miles_to_degrees(interval_miles, endpoint1[0]) #gets interval value in degrees

    total_distance = ((endpoint2[0] - endpoint1[0])**2 + (endpoint2[1] - endpoint1[1])**2)**0.5 #calculates total distance of line
    direction_vector = ((endpoint2[0] - endpoint1[0]) / total_distance, (endpoint2[1] - endpoint1[1]) / total_distance) #calculates direction vector

    points = [] #initializes points list

    #generate first point
    if interval_degrees <= 0: #if interval is less or equal to 0
        points.append(endpoint1) #first point is endpoint 1
    elif interval_degrees >= total_distance: #if interval is greather than line lenght
        points.append(endpoint2) #first point is endpoint 2
    else:
        dist_to_endpoint1 = ((endpoint1[0] - endpoint2[0])**2 + (endpoint1[1] - endpoint2[1])**2)**0.5 #calculate initial distance to endpoint 1 with pythagorean theorem
        if interval_degrees <= dist_to_endpoint1: #if the interval is less or equal to the distance to endpoint1
            first_point = (endpoint1[0] + interval_degrees * direction_vector[0], endpoint1[1] + interval_degrees * direction_vector[1]) #calculate coordinates of first point
        else:
            first_point = (endpoint2[0] - (total_distance - interval_degrees) * direction_vector[0], endpoint2[1] - (total_distance - interval_degrees) * direction_vector[1]) #use the interval distance to set the first point on the line
        points.append(first_point) #append the first point
    
    #generate points at intervals until reaching a distance interval from the other endpoint
    current_distance = interval_degrees # set current distance to 1 interval
    while current_distance < total_distance - interval_degrees: #while were less than 1 interval from the end of the line
        current_point = (points[-1][0] + interval_degrees * direction_vector[0], points[-1][1] + interval_degrees * direction_vector[1]) #calculate the current point
        points.append(current_point) #append the current point
        current_distance += interval_degrees #get the new current distance
    
    # Calculate the last point at a distance interval from the nearest endpoint
    last_distance_to_endpoint2 = ((endpoint2[0] - points[-1][0])**2 + (endpoint2[1] - points[-1][1])**2)**0.5 #get the final distance to endpoint2
    if interval_degrees <= last_distance_to_endpoint2: #if the distance is greater than the interval
        last_point = (endpoint2[0] - interval_degrees * direction_vector[0], endpoint2[1] - interval_degrees * direction_vector[1]) #get the last point using the interval
    else:
        last_point = (endpoint1[0] + (total_distance - interval_degrees) * direction_vector[0], endpoint1[1] + (total_distance - interval_degrees) * direction_vector[1]) #get the last point using the complement distance
    points.append(last_point) #append the last point
    
    return points

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

def getAverageAltitude(point, cluster_df, radius_miles):
    radius_degrees = miles_to_degrees(radius_miles, point[0])
    lat, long = point
    
    filtered_cluster_df = cluster_df[cluster_df.apply(lambda row: haversine(lat, long, row['lat'], row['lng']) <= radius_miles, axis=1)]
    average_altitude = filtered_cluster_df['alt'].mean()
    return average_altitude


#function: takes a line and gets all the parks around it
#parameters: line - dictionary
#returns: a list of parks
def getParks(line):
    search_distance_miles = 0.3 #distance from the line we will search for parks in miles
    search_distance_meters = search_distance_miles * 1609.34 #convert it to meters
    points = generatePoints(line, search_distance_miles) #get points along the line

    unique_spots = set() #create empty set of spots

    headers = { #set headers
        'Content-Type': 'application/json', #content type JSON
        'X-Goog-Api-Key': 'AIzaSyCOsh2QBtZT0mFpOH5dTyk3x4nHdxJsX_4', #api key
        'X-Goog-FieldMask': 'places.name,places.id,places.types,places.formattedAddress,places.location,places.viewport,places.googleMapsUri,places.displayName,places.editorialSummary' #expected fields
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
                        place['distanceFromFlightpath'] = distance_from_line #add the distance_from_line to the object
                        place['averageAltitude'] = getAverageAltitude(point, line['cluster'], search_distance_miles)
                        unique_spots.add(json.dumps(place)) #add spot to unique spots
    spots = list(unique_spots) #turn unique spots into list
    return spots #return spots

if __name__ == "__main__" : 
    # point = (42.18910464633161, -71.09355756834351)
    line = {'slope': 2.0669625894160877,
            'intercept': 189.12936615997356, 
            'max_lat': 42.349176, 
            'max_long': -71.009757, 
            'min_lat': 42.180796, 
            'min_long': -71.094318}
    
    # point = (42.3984127, -70.9868147)
    # getAverageAltitude(point, )

    # spots = getParks(line)


