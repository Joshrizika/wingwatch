import psycopg2
import re

#this file is used to upload the schema to the database and overwrite the existing schema

connection = psycopg2.connect(database="defaultdb", #connect to the database
                              host="wingwatch-do-user-15288104-0.c.db.ondigitalocean.com",
                              user="doadmin",
                              password="AVNS_nwxac_LLHhPIG0DV_4Y",
                              port="25060")

cursor = connection.cursor() #create a cursor object to execute SQL commands

schema_file = 'database/schema.sql' #path to the schema file

#function: gets the table names from the schema file
#parameters: sql - file
#returns: a list of table names
def extract_table_names(sql):
    pattern = re.compile(r'CREATE TABLE (IF NOT EXISTS )?([^\s(]+)', re.IGNORECASE) #create a regex pattern to match table names
    return [match.group(2) for match in pattern.finditer(sql)] #return the table names

with open(schema_file, 'r') as file: #open the schema file
    schema_sql = file.read() #read the file
    table_names = extract_table_names(schema_sql) #get the table names from the schema file

for table_name in table_names: #for each table name
    try: 
        cursor.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE;") #drop the table if it exists
    except psycopg2.Error as e: #if an error occurs
        print(f"An error occurred while dropping table {table_name}: ", e)
        connection.rollback() #rollback the transaction

try:
    cursor.execute(schema_sql) #apply the schema
    connection.commit() #commit the transaction
    print("Schema uploaded successfully.")
except psycopg2.Error as e: #if an error occurs
    print("An error occurred while applying schema: ", e) #print the error
    connection.rollback() #rollback the transaction
finally:
    cursor.close() #close the cursor
    connection.close() #close the connection
