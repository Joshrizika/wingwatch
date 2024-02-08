import pandas as pd
import numpy as np
import psycopg2
import sys

#This file uploads data to the database

#function: inserts spot data into database
#parameters: iataCode - string
#returns: nothing
def insertSpots(iataCode):
    try:
        connection = psycopg2.connect(database="wing-watch-db", #connect to database
                                      host="localhost",
                                      user="joshrizika",
                                      password="wingpass",
                                      port="5432")
        cursor = connection.cursor() #create a cursor object

        #Add data to paths table
        file_path = f'../algorithm/data/pathData/paths_{iataCode}.csv' #save file path to path data
        df = pd.read_csv(file_path) #read csv file into df

        aggregated_df = df.groupby('path_id').agg({
            'latitude': lambda x: list(x),
            'longitude': lambda x: list(x)
        }).reset_index()

        # Convert aggregated DataFrame to list of tuples for database insertion
        data_tuples = [tuple(x) for x in aggregated_df.to_numpy()]
        print(data_tuples)

        cursor.executemany("INSERT INTO paths (path_id, latitude, longitude) VALUES (%s, %s, %s)", data_tuples) #insert data into database

        #Add data to places table
        file_path = f'../algorithm/data/spotData/data/spots_{iataCode}.csv' #save file path to spot data
        df = pd.read_csv(file_path) #read csv file into df

        df = df.where(pd.notnull(df), None) #replace NaN values with None

        data_tuples = [tuple(x) for x in df.to_numpy()] #convert df to list of tuples
        cursor.executemany("INSERT INTO places (address, google_maps_uri, airport, distance_from_flightpath, average_altitude, distance_from_airport, path_id, latitude, longitude, name, description) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)", data_tuples) #insert data into database

        connection.commit() #commit changes

    except psycopg2.Error as e:
        print(f"An error occurred: {e}")
        connection.rollback() #rollback changes
        sys.exit(1)
    finally:
        cursor.close() #close cursor
        connection.close() #close connection

    


if __name__ == '__main__':
    iataCodes = ["ATL", "BOS", "DCA", "DFW", "EWR", "IAD", "JFK", "LAX", "LGA", "ORD", "PHL"]
    for iataCode in iataCodes:
        insertSpots(iataCode)