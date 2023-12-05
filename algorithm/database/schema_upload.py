import psycopg2

#This file deletes the public schema and creates a new one with the schema.sql file

connection = psycopg2.connect(database="wing-watch-db", #connect to database
                              host="localhost",
                              user="joshrizika",
                              password="",
                              port="5432")

cursor = connection.cursor() #create a cursor object

schema_file = 'database/schema.sql' #save schema file path
with open(schema_file, 'r') as file: #open schema file
    schema_sql = file.read() #save to schema_sql variable

try:
    cursor.execute("DROP SCHEMA public CASCADE;") #drop the schema if it already exists
    cursor.execute("CREATE SCHEMA public;") #create a new public schema
    cursor.execute(schema_sql) #add the stored schema to the database
    connection.commit() #commit changes
    print("Schema uploaded successfully.")
except psycopg2.Error as e:
    print("An error occurred: ", e)
    connection.rollback() #rollback changes
finally:
    cursor.close() #close cursor
    connection.close() #close connection