CREATE TABLE paths (
    path_id VARCHAR(5) PRIMARY KEY,
    latitude DOUBLE PRECISION[] NOT NULL,
    longitude DOUBLE PRECISION[] NOT NULL
);

CREATE TABLE places (
    place_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255), 
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    path_id VARCHAR(5) NOT NULL,
    google_maps_uri VARCHAR(255),
    airport CHAR(3) NOT NULL,
    distance_from_flightpath REAL NOT NULL,
    average_altitude REAL NOT NULL,
    distance_from_airport REAL NOT NULL,
    CONSTRAINT fk_path FOREIGN KEY (path_id) REFERENCES paths(path_id)
);