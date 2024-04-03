# Wing Watch

## Introduction

Wing Watch is an innovative app designed to help users find the best locations for plane spotting. It tracks and organizes flight path data, making it easy to identify prime locations for watching planes.

## Overview

The Wing Watch repository contains code essential for data collection and organization, as well as the application's core functionality. This includes scripts for tracking flight paths, displaying data, and clustering flight information to determine optimal viewing spots.

## Installation (Environment)

First make sure pip3 is installed, you can check this by running...
```bash
pip3 --version
```

To make sure all dependencies are installed, run...
```bash
pip3 install -r requirements.txt
```

### General Requirements

[Specify the general requirements for the app. Include details about the programming language, libraries, or any other tools needed.]
Make sure python3 is installed, you can check this by running...
```bash
python3 --version
```

## Configuration

The app's functionality is divided into several scripts, each serving a specific purpose in the data gathering and display process.

### flight_paths.py

This script periodically retrieves live flight data around a specified airport. The data is organized, timestamped, and stored in a .csv file.

### display_data.py

Processes the .csv file to create an interactive map using Folium. Each flight data point is marked on this map, which is saved as an .html file for easy viewing.

### clusters.py

Employs the sklearn DBSCAN clustering algorithm to categorize flight data points based on density. Clusters with fewer than 100 points are filtered out. For the remaining clusters, a logistic regression model calculates the flight paths.

### spots.py

Takes a line segment corresponding to a flightpath and uses the Google Maps Nearby Places API to find parks in the surrounding area around this line.  Those parks are taken as the resulting spots and are assigned attributes such as distance from flightpath, and average altitude.  

### display_spot_data.py

Displays the resulting spot data and its attributes on a map using Folium.

### main.py

Takes in the data output from flight_paths.py and runs that data through the clustering algorithm and the spot finding algorithm.  It saves the results to a .csv file.  

### schema_upload.py

Resets the current database then re initializes it with the schema provided in schema.sql.

### data_upload.py

Uploads spot data to the database.

## Using the App

Visit https://www.wingwatch.net to use the app.

## License

WingWatch is available under the MIT license. See the LICENSE file for more info.
