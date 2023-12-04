import psycopg2

connection = psycopg2.connect(database="wing-watch-db",
                              host="localhost",
                              user="joshrizika",
                              password="",
                              port="5432")

cursor = connection.cursor()

schema_file = 'database/schema.sql'
with open(schema_file, 'r') as file:
    schema_sql = file.read()

try:
    cursor.execute("DROP SCHEMA public CASCADE;") #drop the schema if it already exists
    cursor.execute("CREATE SCHEMA public;") #create a new schema
    cursor.execute(schema_sql)
    connection.commit()
    print("Schema uploaded successfully.")
except psycopg2.Error as e:
    print("An error occurred: ", e)
    connection.rollback()
finally:
    # Close the cursor and connection
    cursor.close()
    connection.close()