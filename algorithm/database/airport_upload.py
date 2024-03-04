import psycopg2
import re
import json

# Database connection details
DATABASE = "defaultdb"
HOST = "wingwatch-do-user-15288104-0.c.db.ondigitalocean.com"
USER = "doadmin"
PASSWORD = "AVNS_nwxac_LLHhPIG0DV_4Y"
PORT = "25060"

# Connect to the database
connection = psycopg2.connect(database=DATABASE, host=HOST, user=USER, password=PASSWORD, port=PORT)
cursor = connection.cursor()

# Schema to create the airports table
create_table_query = """
CREATE TABLE IF NOT EXISTS airports (
    airport_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    iata_code CHAR(3) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation REAL NOT NULL
);
"""

# Function to extract airport data from a JavaScript file
def load_airport_data(js_file_path):
    with open(js_file_path, 'r') as file:
        content = file.read()
        # Find array assignment to variable
        data_str = re.search(r"const airportData = (\[.*?\]);", content, re.DOTALL).group(1)
        # Convert JavaScript array to Python list
        data_json = json.loads(data_str)
        return data_json

# Function to insert airport data into the database
def insert_airport_data(airport_data):
    insert_query = """
    INSERT INTO airports (name, iata_code, latitude, longitude, elevation)
    VALUES (%s, %s, %s, %s, %s);
    """
    for airport in airport_data:
        if airport["type"] == "large_airport":  # Ensure the airport is a large airport
            # Splitting coordinates into latitude and longitude
            coordinates = airport["coordinates"].split(", ")
            latitude = float(coordinates[0])
            longitude = float(coordinates[1])
            # Convert elevation to float, use 0 if None
            elevation = float(airport.get("elevation_ft", 0) or 0)
            # Extract name and IATA code
            name = airport["name"]
            iata_code = airport["iata_code"]
            # Execute the insert query
            cursor.execute(insert_query, (name, iata_code, latitude, longitude, elevation))

try:
    cursor.execute(create_table_query)
    airport_data = load_airport_data("data/airport_data.js")
    insert_airport_data(airport_data)
    connection.commit()
    print("Airports table created and data inserted successfully for large airports only.")
except psycopg2.Error as e:
    print(f"An error occurred: {e}")
    connection.rollback()
finally:
    cursor.close()
    connection.close()