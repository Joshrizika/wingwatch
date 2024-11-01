from flight_paths import findAirportCoordinatesByIATACode
from scipy.stats import gaussian_kde
from sklearn.cluster import DBSCAN
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import folium
import shutil
import math
import csv
import os

#This file takes flight data collected on an airport and runs it through a clustring algorithm to find the most common flight paths.  The top clusters have a polynomial regression line fitted to them.

#function: converts distance_miles into degrees based on the latitude given
#parameters: distance_miles - float, latitude - float
#returns: distance in degrees
def miles_to_degrees(distance_miles, latitude):
    earth_radius_miles = 3958.8 #earth's radius in miles
    circumference_at_latitude = 2 * math.pi * earth_radius_miles * math.cos(math.radians(latitude)) #calculate circumference of earth at latitude
    distance_degrees = (distance_miles / circumference_at_latitude) * 360.0 #calculate degrees
    
    return distance_degrees #return degrees

#function: display the flight data in the clusters that it has been organized into
#parameters: flight_data - Pandas DataFrame, cluster_labels - list
#returns: nothing
def visualizeClusters(flight_data):
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
    if os.path.exists(f'data/flightData/maps/clusters/{iataCode}') and os.path.isdir(f'data/flightData/maps/clusters/{iataCode}'):
        shutil.rmtree(f'data/flightData/maps/clusters/{iataCode}') #remove the directory and its contents
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
        
        os.makedirs(f'data/flightData/maps/clusters/{iataCode}', exist_ok=True) #create a new directory
        map.save(f'data/flightData/maps/clusters/{iataCode}/cluster_{cluster_num}_map.html') #save the map

#function: sort the data provided into clusters using DBSCAN
#parameters: iataCode - string
#returns: flight data with column specifying cluster, and dictionary of cluster name and size
def createClusters(iataCode):
    data_path = f"data/flightData/data/flight_log_{iataCode}.csv" 

    eps_miles = 0.125 #epsilon is the distance between points that DBSCAN looks for another point in order to provide a classification of either noise, non-core, or core points. 
    minPts = 5 #minimum points to form a cluster

    eps = miles_to_degrees(eps_miles, findAirportCoordinatesByIATACode(iataCode)[0]) #given the inputed epsilon value in miles, convert into degrees at the latitude of the specified airport
    
    flight_data = pd.read_csv(data_path) #read flight data
    flight_data['timestamp'] = pd.to_datetime(flight_data['timestamp']) #make sure the timestamp is in datetime format

    arriving_flight_data = flight_data[flight_data['arr_iata'] == iataCode] #filter arriving flights
    departing_flight_data = flight_data[flight_data['dep_iata'] == iataCode] #filter departing flights

    arriving_coordinates = arriving_flight_data[['lat', 'lng']] #get coordinate values for arriving flights
    departing_coordinates = departing_flight_data[['lat', 'lng']] #get coordinate values for departing flights

    arriving_dbscan = DBSCAN(eps=eps, min_samples=minPts) #initialize arriving DBSCAN with parameters
    arriving_dbscan.fit(arriving_coordinates) #fit arriving DBSCAN to my data

    departing_dbscan = DBSCAN(eps=eps, min_samples=minPts) #initialize departing DBSCAN with parameters
    departing_dbscan.fit(departing_coordinates) #fit departing DBSCAN to my data

    #DBSCAN takes 2 arguments: eps and min_samples
    #eps(ε) is the distance between points that DBSCAN looks for another point 
    #min_samples is the minimum number of points that DBSCAN looks for to form a cluster
    #using these variable and a list of coordinate, DBSCAN will provide a classification of either noise, non-core, or core points.

    arriving_cluster_labels = arriving_dbscan.labels_ #get all the arriving dbscan labels
    departing_cluster_labels = [label + (len(np.unique(arriving_cluster_labels))-1) if label != -1 else label for label in departing_dbscan.labels_] #get all the departing dbscan labels and change them to not overlap with arriving dbscan labels

    arriving_flight_data['cluster'] = arriving_cluster_labels #add the cluster labels to the arriving dataframe
    departing_flight_data['cluster'] = departing_cluster_labels #add the cluster labels to the departing dataframe

    flight_data = pd.concat([arriving_flight_data, departing_flight_data]) #concatenate the data together

    unique_labels = list(set(arriving_cluster_labels) | set(departing_cluster_labels)) #get all unique labels
    num_clusters = len(unique_labels) - 1 #get the total number of clusters

    cluster_labels = flight_data['cluster'].to_list() #get a list of cluster labels

    cluster_sizes = {label: np.sum(cluster_labels == label) for label in unique_labels if label != -1} #calculate the size of each cluster

    print(f"Number of clusters: {num_clusters}") #print out total number of clusters
    for label, size in cluster_sizes.items(): #for all clusters
        if label != -1: #if they are not noise
            print(f"Cluster {label}: {size} points") #print out the cluster and its corresponding size
        else: #if they are noise
            print(f"Noise: {size} points") #print out the noise and its corresponding size

    # visualizeClusters(flight_data) #visualize the clusters

    return (flight_data, cluster_sizes)

#function: get the paths used in these clusters
#parameters: iataCode - string
#returns: dictionary containing slope, y-intercept, and 4 coordinate bounding lines
def getPaths(iataCode):
    flight_data, cluster_sizes = createClusters(iataCode) #create the clusters and get the flight data and cluster data

    sorted_clusters = sorted(cluster_sizes.items(), key=lambda item: item[1], reverse=True) #sort the clusters based on size

    top_cluster_dict = {cluster: size for cluster, size in sorted_clusters[:2]} #add the top two clusters to the dictionary
    
    top_cluster_dict.update({cluster: size for cluster, size in sorted_clusters[2:] if size >= 100}) #filter out all remainin clusters that have less than 100 points

    top_clusters = list(top_cluster_dict.keys()) #make a list of the remaining clusters
    top_cluster_flight_data = flight_data[flight_data['cluster'].isin(top_clusters)] #filter out all data not present in the top clusters
    top_cluster_flight_data["airport"] = iataCode


    cluster_dfs = [] #create a new list to store individual cluster flight data

    for cluster in top_clusters: #for each cluster
        new_cluster_df = top_cluster_flight_data[top_cluster_flight_data['cluster'] == cluster].reset_index(drop=True) #filter out data that does not belong to this cluster
        cluster_dfs.append(new_cluster_df) #append the cluster data to a list of cluster dataframes
    
    print(cluster_dfs)

    displayClusterData(cluster_dfs, iataCode)

    flight_paths = [] #create a new list to store information about the lines

    for cluster_df in cluster_dfs:
        X = np.array(cluster_df['lng']) #extract longitude in the form of a 2D array
        y = np.array(cluster_df['lat']) #extract latitude in the form of a 1D array

        xy = np.vstack([X, y]) #stack arrays in sequence by row
        z = gaussian_kde(xy)(xy) #peform kernel density estimate on data

        density_threshold = np.percentile(z, 10)  #keep the top 80% densest points
        high_density_indices = z >= density_threshold #specify indices

        X_filtered = X[high_density_indices] #filter out X data
        y_filtered = y[high_density_indices] #filter out y data
        weights_filtered = z[high_density_indices] / max(z[high_density_indices])  #normalize the weights

        degree = 20 #specify degree of polynomial line

        coefficients = np.polyfit(X_filtered, y_filtered, degree, w=weights_filtered) #get coefficients from filtered data

        poly = np.poly1d(coefficients) #create polynomial function from coefficients

        X_curve = np.linspace(min(X_filtered), max(X_filtered), 100) #generate x values along curve for plotting
        y_curve = poly(X_curve) #generate corresponding y values

        # plt.scatter(X, y, c=z, s=50, label='Data Points') #create a scatter plot with all the data
        # plt.plot(X_curve, y_curve, color='red', label='Polynomial Regression')
        # plt.title(f'Cluster: {cluster_df.iloc[0]["cluster"]}')
        # plt.xlabel('Longitude') #label longitude
        # plt.ylabel('Latitude') #label latitude
        # plt.legend() #create a legend
        # plt.show() #show the plot

        # Print the polynomial regression equation
        equation = f'Latitude = {coefficients[-1]:.2f} '  # Intercept term
        for i in range(degree, 0, -1):
            equation += f'+ {coefficients[i]:.2f} * Longitude^{i} '
        print(f"Polynomial Regression Equation: {equation}")

        new_path_dict = {
            'coefficients': coefficients,
            'max_lat': np.max(y_curve), 
            'max_long': np.max(X_curve), 
            'min_lat': np.min(y_curve), 
            'min_long': np.min(X_curve),
            'cluster': cluster_df
        }

        print(new_path_dict)

        flight_paths.append(new_path_dict) #append it to the list of paths

    return flight_paths #return the list of path

if __name__ == "__main__":  
    flight_paths = getPaths("BOS")
    # print(flight_paths)






