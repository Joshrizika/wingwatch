"use client"

import { useEffect } from 'react';
import { unstable_noStore as noStore } from "next/cache";
import { api } from "~/trpc/react";
import Navbar from '../_components/Navbar';
import useLocation from '../hooks/useLocation';

declare global {
  interface Window {
    initMap?: () => void;
  }
}

export default function Explore() {
    noStore();

    // const session = api.main.getSession.useQuery().data;
    const placesQuery = api.main.findPlaces.useQuery();
    const pathsQuery = api.main.findPaths.useQuery();
    const { location, error } = useLocation();

    useEffect(() => {
        const center = location.latitude && location.longitude ? { lat: location.latitude, lng: location.longitude } : {lat: -2.8203035410171496e+46, lng: -118.4622};

        // Dynamically load the Google Maps script with the initMap callback
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAXt99dXCkF4UFgLWPckl6pKzfCwc792ts&loading=async&callback=initMap`;
        script.async = true;
        document.body.appendChild(script);

        // Attach the initMap function to the window object
        window.initMap = function () {
            if (error){
                console.log(error);
            }
            const map = new google.maps.Map(document.getElementById("map")!, {
                center: center,
                zoom: 12,
            });

            if (location.latitude && location.longitude) {
                new google.maps.Marker({
                    position: center,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7, // Size of the dot
                        fillColor: '#4285F4', // Blue color
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 2,
                    },
                    title: "You are here",
                });
            }
        
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
            
            // Adjust the forEach loop to include min and max latitude values
            pathsQuery.data?.forEach((path: { latitude: number[], longitude: number[] }) => {
                const pathPoints: { lat: number, lng: number }[] = path.latitude.map((lat: number, index: number) => ({
                    lat: lat,
                    lng: path.longitude[index]!
                }));
                
                const pathPolyline = new google.maps.Polyline({
                    path: pathPoints,
                    geodesic: true,
                    strokeColor: '#0000FF', // Customize color as needed
                    strokeOpacity: 1.0,
                    strokeWeight: 2,
                });
                pathPolyline.setMap(map);
            });
            
        };

        // Cleanup: Remove the script and clean up the window object
        return () => {
            document.body.removeChild(script);
            delete window.initMap;
        };
    }, [placesQuery.data, pathsQuery.data, location, error]);

    return (
        <>
            <Navbar />
            <div>
                <div id="map" style={{ height: '600px', width: '100%' }}></div>
            </div>
        </>
    );
}
