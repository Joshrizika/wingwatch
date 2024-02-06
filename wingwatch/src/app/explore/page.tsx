"use client"

import { useEffect } from 'react';
import { unstable_noStore as noStore } from "next/cache";
import { api } from "~/trpc/react";
import Navbar from '../_components/Navbar';

declare global {
  interface Window {
    initMap?: () => void;
  }
}

export default function Explore() {
    noStore();

    const session = api.main.getSession.useQuery().data;
    const placesQuery = api.main.findPlaces.useQuery();

    useEffect(() => {
        // Dynamically load the Google Maps script with the initMap callback
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts&callback=initMap`;
        script.async = true;
        document.body.appendChild(script);

        // Attach the initMap function to the window object
        window.initMap = function () {
            const mapElement = document.getElementById("map")!;
            const map = new google.maps.Map(mapElement, {
                center: { lat: 42.3601, lng: -71.0589 },
                zoom: 8,
            });

            // Add markers to the map based on the places
            placesQuery.data?.forEach(place => {
                const marker = new google.maps.Marker({
                    position: { lat: place.latitude, lng: place.longitude },
                    map: map,
                    title: place.name,
                });

                const infowindow = new google.maps.InfoWindow({
                    content: `<div><h1>${place.name}</h1>
                              <p>${place.address}</p>
                              <p>Airport: ${place.airport}</p>
                              <p>Distance From Flightpath: ${place.distance_from_flightpath}</p>
                              <p>Average Altitude: ${place.average_altitude}</p>
                              <p>Distance From Airport: ${place.distance_from_airport}</p></div>`,
                });

                marker.addListener('mouseover', function() {
                    infowindow.open(map, marker);
                });

                marker.addListener('mouseout', function() {
                    infowindow.close();
                });
            });
        };

        // Cleanup: Remove the script and clean up the window object
        return () => {
            document.body.removeChild(script);
            delete window.initMap;
        };
    }, [placesQuery.data]);

    return (
        <>
            <Navbar />
            <div>
                <div id="map" style={{ height: '600px', width: '100%' }}></div>
            </div>
        </>
    );
}
