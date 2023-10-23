import pandas as pd
import numpy as np
import math
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from flight_data import findAirportCoordinatesByIATACode
import matplotlib.pyplot as plt

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


def visualizeClusters(flight_data, cluster_labels):
    flight_data['cluster'] = cluster_labels

    clustered_data = flight_data[flight_data['cluster'] != -1]

    plt.figure(figsize=(10, 8))
    plt.scatter(clustered_data['lng'], clustered_data['lat'], c=clustered_data['cluster'], cmap='rainbow', s=10)
    plt.title('DBSCAN Clustering of Flight Data')
    plt.xlabel('Longitude')
    plt.ylabel('Latitude')
    plt.colorbar()
    plt.show()


def createClusters(data_path, iataCode):
    eps_miles = 0.125 #maximum distance in miles to form a cluster
    minPts = 3 #minimum points to form a cluster

    print("here1")
    eps = miles_to_degrees(eps_miles, findAirportCoordinatesByIATACode(iataCode)[0])
    
    flight_data = pd.read_csv(data_path)
    flight_data['timestamp'] = pd.to_datetime(flight_data['timestamp'])

    coordinates = flight_data[['lat', 'lng']]

    # print(coordinates)

    dbscan = DBSCAN(eps=eps, min_samples=minPts)

    dbscan.fit(coordinates)

    cluster_labels = dbscan.labels_

    # print(f"Cluster Labels: {cluster_labels}")

    unique_labels = np.unique(cluster_labels)
    # print(f"Unique Labels: {unique_labels}")

    num_clusters = len(unique_labels) - 1

    cluster_sizes = {label: np.sum(cluster_labels == label) for label in unique_labels if label != -1}

    print(f"Number of clusters: {num_clusters}")
    for label, size in cluster_sizes.items():
        if label != -1:
            print(f"Cluster {label}: {size} points")
        else:
            print(f"Noise: {size} points")

    visualizeClusters(flight_data, cluster_labels)

if __name__ == "__main__":  
    data_path = "flightData/flight_log_BOS.csv"

    createClusters(data_path, data_path[-7:-4]) 






