from cuid2 import cuid_wrapper
from typing import Callable
import pandas as pd
import psycopg2
import sys
import os

# This file uploads data to the database.

# Generate a unique identifier for the path.
cuid_generator: Callable[[], str] = cuid_wrapper()


# Function: Inserts spot data into the database.
# Parameters: iataCode - string
# Returns: nothing
def insertSpots(iataCode):
    try:
        # Connect to the database.
        connection = psycopg2.connect(database="defaultdb",
                                      host="wingwatch-do-user-15288104-0.c.db.ondigitalocean.com",
                                      user="doadmin",
                                      password="AVNS_nwxac_LLHhPIG0DV_4Y",
                                      port="25060")
        
        cursor = connection.cursor()

        # Add data to paths table.
        file_path = f'../algorithm/data/pathData/paths_{iataCode}.csv'
        df = pd.read_csv(file_path)

        aggregated_df = df.groupby('path_id').agg({
            'latitude': lambda x: list(x),
            'longitude': lambda x: list(x)
        }).reset_index()

        data_tuples = [tuple(x) for x in aggregated_df.to_numpy()]
        cursor.executemany("INSERT INTO paths (path_id, latitude, longitude) VALUES (%s, %s, %s)", data_tuples)

        # Add data to places table with duplicate filtering.
        file_path = f'../algorithm/data/spotData/data/spots_{iataCode}.csv'

        if not os.path.exists(file_path):
            connection.commit()
            return

        df = pd.read_csv(file_path)
        df = df.where(pd.notnull(df), None) # Replace NaN with None

        # Use the specific column names from the file for processing.
        # Remove duplicates by keeping the row with the minimum averageAltitude for each place.
        df['rank'] = df.groupby(['latitude', 'longitude', 'displayName'])['averageAltitude'].rank(method='first', ascending=True)
        df_filtered = df[df['rank'] == 1].drop('rank', axis=1)

        # Prepare the data tuples, respecting the new column names and ensuring null values for NaN in description fields.
        columns = ['formattedAddress', 'googleMapsUri', 'airport', 'distanceFromFlightpath', 'averageAltitude', 
                   'distanceFromAirport', 'path_id', 'latitude', 'longitude', 'displayName', 'editorialSummary']
        df_filtered['editorialSummary'] = df_filtered['editorialSummary'].replace('NaN', "")  # Replace "" with None in editorialSummary
        data_tuples = [(cuid_generator(),) + tuple(x) for x in df_filtered[columns].to_numpy()]
        
        insert_query = "INSERT INTO places (place_id, address, google_maps_uri, airport, distance_from_flightpath, average_altitude, " \
                       "distance_from_airport, path_id, latitude, longitude, name, description) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        
        cursor.executemany(insert_query, data_tuples)

        connection.commit()

    except psycopg2.Error as e:
        print(f"An error occurred: {e}")
        connection.rollback()
        sys.exit(1)
    finally:
        # Ensure resources are released properly.
        cursor.close()
        connection.close()

if __name__ == '__main__':
    iataCodes = ['SAN']
    for iataCode in iataCodes:
        insertSpots(iataCode)