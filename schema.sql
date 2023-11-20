CREATE TABLE places (
    place_id VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    viewport JSONB,
    google_maps_uri VARCHAR(255),
    airport CHAR(3) NOT NULL,
    distance_from_flightpath REAL NOT NULL,
    average_altitude REAL NOT NULL,
    distance_from_airport REAL NOT NULL
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(255),
    username VARCHAR(50),
    password VARCHAR(255),
    user_type VARCHAR(10),
    bio TEXT,
    account_created TIMESTAMP
);

CREATE TABLE rating (
    rating_id SERIAL PRIMARY KEY,
    user_id SERIAL NOT NULL,
    place_id VARCHAR(50) NOT NULL,
    rating INT NOT NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_place FOREIGN KEY (place_id) REFERENCES places(place_id)
);

CREATE TABLE review (
    review_id SERIAL PRIMARY KEY,
    user_id SERIAL NOT NULL,
    place_id VARCHAR(50) NOT NULL,
    review TEXT NOT NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_place FOREIGN KEY (place_id) REFERENCES places(place_id)
);

CREATE TABLE favorited (
    favorited_id SERIAL PRIMARY KEY,
    user_id SERIAL NOT NULL,
    place_id VARCHAR(50) NOT NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_place FOREIGN KEY (place_id) REFERENCES places(place_id)
);