"use client"

// import { useEffect, useState } from 'react';
import { unstable_noStore as noStore } from "next/cache";
import { api } from "~/trpc/react";

export default function Explore() {
    noStore();

    const sessionQuery = api.main.getSession.useQuery(); // Use useSession hook for session data
    const session = sessionQuery.data;

    const placesQuery = api.main.findPlaces.useQuery();

    return (
        <div>
            {session ? <p>Logged in as {session.user?.name}</p> : <p>Not logged in</p>}
            {placesQuery.data ? (
                placesQuery.data.map((place, index) => (
                    <div key={index} className="place-info">
                    <h2>{place.name}</h2>
                    <p>{place.address}</p>
                    <p>Description: {place.description}</p>
                    <p>Latitude: {place.latitude}</p>
                    <p>Longitude: {place.longitude}</p>
                    <a href={place.google_maps_uri} target="_blank" rel="noopener noreferrer">View on Google Maps</a>
                    <p>Airport: {place.airport}</p>
                    <p>Distance from Flightpath: {place.distance_from_flightpath}</p>
                    <p>Average Altitude: {place.average_altitude}</p>
                    <p>Distance from Airport: {place.distance_from_airport}</p>
                </div>
                ))
            ) : (
                <p>No places found.</p>
            )}
        </div>
    );
}
