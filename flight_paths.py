import pandas as pd
import numpy as np
import math
from sklearn.cluster import DBSCAN
from clusters import findAirportCoordinatesByIATACode
import matplotlib.pyplot as plt
import folium
import os
import shutil
from sklearn.linear_model import LinearRegression

#function: given the number of miles, express it in degrees at the specified latitude
#parameters: miles - int, latitude - float
#returns: epsilon (miles in degrees at specified latitude)
def miles_to_degrees(miles, latitude):
    earth_radius_miles = 3958.8 #define earth radius
    distance_radians = miles/earth_radius_miles #earth radius in radians
    distance_degrees = math.degrees(distance_radians) #earth radius in degrees
    degrees_per_mile = 1/69 #69 miles per 1 degree of latitude

    eps_in_degrees = distance_degrees / math.cos(math.radians(latitude)) * degrees_per_mile #find eps

    return eps_in_degrees #return eps

#function: display the flight data in the clusters that it has been organized into
#parameters: flight_data - Pandas DataFrame, cluster_labels - list
#returns: nothing
def visualizeClusters(flight_data, cluster_labels):
    flight_data['cluster'] = cluster_labels #add a cluster label to the flight data

    clustered_data = flight_data[flight_data['cluster'] != -1] #if the data is noise then remove it

    plt.figure(figsize=(10, 8)) #create a figure
    plt.scatter(clustered_data['lng'], clustered_data['lat'], c=clustered_data['cluster'], cmap='rainbow', s=10) #create a scatter plot using long, lat, organize by cluster on rainbow scale
    plt.title('DBSCAN Clustering of Flight Data') #give the figure a title
    plt.xlabel('Longitude') #mark x as longitude
    plt.ylabel('Latitude') #mark y as latitude
    plt.colorbar() #create the color bar
    plt.show() #show the graph

#function: to display all the points recorded in the collected data
#parameters: data - Pandas DataFrame, iataCode - string
#returns: nothing
def displayClusterData(cluster_dfs, iataCode):
    shutil.rmtree(f'flightData/maps/clusters/{iataCode}') #remove the directory and its contents
    for cluster in cluster_dfs:
        cluster_num = cluster.iloc[0]['cluster']
        map = folium.Map(location=list(findAirportCoordinatesByIATACode(iataCode)), zoom_start=8) #create the map with the airport at the center

        for index, row in cluster.iterrows(): #for each marker add the data below
            tooltip_text = f"Timestamp: {row['timestamp']}<br>"
            tooltip_text += f"Flight ICAO: {row['flight_icao']}<br>"
            tooltip_text += f"Latitude: {row['lat']}<br>"
            tooltip_text += f"Longitude: {row['lng']}<br>"
            tooltip_text += f"Altitude: {row['alt']}<br>"
            tooltip_text += f"Departure IATA: {row['dep_iata']}<br>"
            tooltip_text += f"Arrival IATA: {row['arr_iata']}<br>"
            folium.Marker([row['lat'], row['lng']], tooltip=tooltip_text).add_to(map) #add the marker to the map
        
        os.makedirs(f'flightData/maps/clusters/{iataCode}', exist_ok=True) #create a new directory
        map.save(f'flightData/maps/clusters/{iataCode}/cluster_{cluster_num}_map.html') #save the map

#function: sort the data provided into clusters using DBSCAN
#parameters: data_path - string
#returns: flight data with column specifying cluster, and dictionary of cluster name and size
def createClusters(data_path):
    iataCode = data_path[-7:-4] #get the iataCode from the dataPath

    eps_miles = 8 #epsilon is the distance between points that DBSCAN looks for another point in order to provide a classification of either noise, non-core, or core points. 
    minPts = 5 #minimum points to form a cluster

    eps = miles_to_degrees(eps_miles, findAirportCoordinatesByIATACode(iataCode)[0]) #given the inputed epsilon value in miles, convert into degrees at the latitude of the specified airport
    
    flight_data = pd.read_csv(data_path) #read flight data
    flight_data['timestamp'] = pd.to_datetime(flight_data['timestamp']) #make sure the timestamp is in datetime format

    coordinates = flight_data[['lat', 'lng']] #get coordinate values

    dbscan = DBSCAN(eps=eps, min_samples=minPts) #initialize DBSCAN with parameters
    dbscan.fit(coordinates) #fit DBSCAN to my data

    cluster_labels = dbscan.labels_ #get all the dbscan labels

    flight_data['cluster'] = cluster_labels #add the cluster labels to the dataframe

    unique_labels = np.unique(cluster_labels) #get all unique clusters
    num_clusters = len(unique_labels) - 1 #get the total number of clusters

    cluster_sizes = {label: np.sum(cluster_labels == label) for label in unique_labels if label != -1} #calculate the size of each cluster

    # print(f"Number of clusters: {num_clusters}") #print out total number of clusters
    # for label, size in cluster_sizes.items(): #for all clusters
    #     if label != -1: #if they are not noise
    #         print(f"Cluster {label}: {size} points") #print out the cluster and its corresponding size
    #     else: #if they are noise
            # print(f"Noise: {size} points") #print out the noise and its corresponding size

    # visualizeClusters(flight_data, cluster_labels) #visualize the clusters

    return (flight_data, cluster_sizes)

#function: get the equations for the paths used in these clusters
#parameters: data_path - string
#returns: dictionary containing slope, y-intercept, and 4 coordinate bounding lines
def getPaths(data_path):
    flight_data, cluster_sizes = createClusters(data_path) #create the clusters and get the flight data and cluster data
    top_cluster_dict = {cluster: size for cluster, size in cluster_sizes.items() if size >= 100} #filter out clusters that have less than 100 points
    top_clusters = list(top_cluster_dict.keys()) #make a list of the remaining clusters
    top_cluster_flight_data = flight_data[flight_data['cluster'].isin(top_clusters)] #filter out all data not present in the top clusters

    cluster_dfs = [] #create a new list to store individual cluster flight data

    for cluster in top_clusters: #for each cluster
        new_cluster_df = top_cluster_flight_data[top_cluster_flight_data['cluster'] == cluster].reset_index(drop=True) #filter out data that does not belong to this cluster
        cluster_dfs.append(new_cluster_df) #append the cluster data to a list of cluster dataframes

    # displayClusterData(cluster_dfs, data_path[-7:-4])

    flight_paths_lines = [] #create a new list to store information about the lines

    for cluster_df in cluster_dfs:
        X = cluster_df[['lng']] #extract longitude in the form of a 2D array
        y = cluster_df['lat'] #extract latitude in the form of a 1D array

        model = LinearRegression() #create a linear regression model
        model.fit(X, y) #fit points to this linear regression model

        slope = model.coef_[0] #get the slope of the model
        intercept = model.intercept_ #get the y-intercept of the model

        plt.scatter(X, y, label='Data Points') #create a scatter plot with all the data
        plt.plot(X, model.predict(X), color='red', label='Regression Line') #plot the projected linear regression model for the provided data
        plt.xlabel('Longitude') #label longitude
        plt.ylabel('Latitude') #label latitude
        plt.legend() #create a legend
        plt.show() #show the plot

        print(f"Regression Equation: Latitude = {slope:.2f} * Longitude + {intercept:.2f}") #print out line equation

        new_line_dict = {'slope': slope, 
                         'intercept': intercept, 
                         'max_lat': max(cluster_df['lat']), 
                         'max_long': max(cluster_df['lng']), 
                         'min_lat': min(cluster_df['lat']), 
                         'min_long': min(cluster_df['lng'])} #create a dictionary of all the line information

        flight_paths_lines.append(new_line_dict) #append it to the list of lines

    return flight_paths_lines #return the list of lines

if __name__ == "__main__":  
    data_path = "flightData/flight_log_BOS.csv" #should be in format xxxxxxxxxx_{iataCode}.csv
    flight_path_lines = getPaths(data_path)
    print(flight_path_lines)





