import pandas as pd

# Read the CSV file into a DataFrame
input_file = "flightData/flight_log_BOS.csv"
df = pd.read_csv(input_file)

# Define filtering conditions
altitude_condition = (df['alt'] <= 1500) & (df['alt'] >= 30)
latitude_condition = (df['lat'] > 41.93059021143923) & (df['lat'] < 42.798009328560774)
longitude_condition = (df['lng'] > -71.59218935111475) & (df['lng'] < -70.41821714888523)

# Apply filtering conditions
filtered_df = df[altitude_condition & latitude_condition & longitude_condition]

# Save the filtered data to a new CSV file
output_file = "filtered_flight_log_BOS.csv"
filtered_df.to_csv(output_file, index=False)

print(f"Filtered data saved to {output_file}")
