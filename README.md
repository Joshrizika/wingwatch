## Introduction Wing Watch

Wing Watch is an app that helps users find places to watch planes from

## Overview

The repository contains the code used to gather and organize the data.  Along with the code for the app itself.  

## Installation (Environment)



### General Requirements


## Configuration

flight_paths.py - Tracks data for the specified airport and outputs it in a .csv.  
display_data.py - Displays location data from a .csv.  
clusters.py - takes the data from a .csv and organizes it into clusters, filters out all insignificant clusters, and then plots a line through each cluster to find a flight path.  

### flight_paths.py

We call a function every ten seconds which calls an API request and retrieves live flight data around the specified airport.  That data is organized, filtered, timestamped, and put into a .csv file.

### display_data.py

Takes data from the .csv file and creates a map using folium that stores each point as a marker on a map.  This map is saved as a .html file that can be opened in a browser to observe the data

### clusters.py

Using the data collected we sklearn clustering algorithm DBSCAN to sort the points into clusters based on their density.  The clusters with less than 100 points are then removed and the remaining clusters have the sklearn linear regression model performed on them to calculate a flight path.  These line slope formulas are then returned.

### main.py

To be created
