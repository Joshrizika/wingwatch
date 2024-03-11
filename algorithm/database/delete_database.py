import psycopg2

def delete_all_tables():
    try:
        # Connect to the database
        connection = psycopg2.connect(database="defaultdb",
                                      host="wingwatch-do-user-15288104-0.c.db.ondigitalocean.com",
                                      user="doadmin",
                                      password="AVNS_nwxac_LLHhPIG0DV_4Y",
                                      port="25060")
        cursor = connection.cursor()

        # SQL command to delete all tables from the database
        delete_query = "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        cursor.execute(delete_query)

        # Commit the changes to the database
        connection.commit()
        print("All tables have been deleted successfully.")

    except psycopg2.Error as e:
        print(f"An error occurred: {e}")
        # Rollback in case of any error
        connection.rollback()
    
    finally:
        if connection:
            cursor.close()
            connection.close()
            print("PostgreSQL connection is closed.")

if __name__ == '__main__':
    delete_all_tables()
