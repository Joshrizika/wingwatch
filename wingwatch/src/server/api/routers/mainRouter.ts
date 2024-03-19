import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getServerAuthSession } from "~/server/auth";
import fs from "fs";
import csv from "csv-parser";

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  lat1 = toRadians(lat1);
  lat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert degree to radians
function toRadians(degree: number): number {
  return degree * (Math.PI / 180);
}

export const mainRouter = createTRPCRouter({
  getSession: publicProcedure
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      return getServerAuthSession();
    }),
  findPaths: publicProcedure
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      const paths = await db.paths.findMany();
      return paths;
    }),
  findAirports: publicProcedure
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      const airports = await db.airports.findMany({
        where: {
          places: {
            some: {
              isVerified: true,
            },
          },
        },
      });
      return airports;
    }),

  //Explore Page

  findPlaces: publicProcedure
    .input(
      z.object({
        pathId: z.string().optional(),
        iata_code: z.string().optional(),
      }),
    ) // Input required for this procedure
    .query(async ({ input }) => {
      let whereClause = {};
      if (input.pathId && input.pathId !== "") {
        whereClause = { path: { path_id: input.pathId } };
      } else if (input.iata_code && input.iata_code !== "") {
        whereClause = { airport: input.iata_code };
      }
      const places = await db.places.findMany({
        where: {
          ...whereClause,
          isVerified: true,
        },
      });
      return places;
    }),
  findFilteredPlaces: publicProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number(),
        sort: z.string(),
        pathId: z.string().optional(),
        iata_code: z.string().optional(),
      }),
    ) // Input required for this procedure
    .query(async ({ input }) => {
      const places = await db.places.findMany({
        where: { isVerified: true },
        include: { reviews: true, path: true, airportDetails: true },
      });

      // Filter and sort places within a radius
      let filteredAndSortedPlaces = places
        .map((place) => ({
          ...place,
          distance: calculateDistance(
            input.latitude,
            input.longitude,
            place.latitude,
            place.longitude,
          ),
        }))
        .filter((place) => place.distance <= input.radius) // Keep only places within the radius
        .filter(
          (place) =>
            place.path &&
            (!input.pathId || place.path.path_id === input.pathId),
        ) // Filter by pathId if provided
        .filter(
          (place) =>
            place.airportDetails &&
            (!input.iata_code ||
              place.airportDetails.iata_code === input.iata_code),
        ); // Filter by iata_code if provided and ensure place has airport details

      // Sort the places based on the sort parameter
      if (input.sort === "closest") {
        filteredAndSortedPlaces = filteredAndSortedPlaces.sort(
          (a, b) => a.distance - b.distance,
        );
      } else if (input.sort === "best") {
        // 'best' means the lowest value of sqrt((average altitude)^2 + (distance_from_flightpath)^2)
        filteredAndSortedPlaces = filteredAndSortedPlaces.sort((a, b) => {
          const aValue = Math.sqrt(
            Math.pow(a.average_altitude, 2) +
              Math.pow(a.distance_from_flightpath ?? 0.15, 2),
          );
          const bValue = Math.sqrt(
            Math.pow(b.average_altitude, 2) +
              Math.pow(b.distance_from_flightpath ?? 0.15, 2),
          );
          return aValue - bValue;
        });
      } else if (input.sort === "rating") {
        filteredAndSortedPlaces = filteredAndSortedPlaces
          .map((place) => {
            const totalRating = place.reviews.reduce(
              (sum, review) => sum + review.rating,
              0,
            );
            const averageRating =
              place.reviews.length > 0 ? totalRating / place.reviews.length : 0;
            return { ...place, averageRating };
          })
          .sort((a, b) => b.averageRating - a.averageRating);
      }

      return filteredAndSortedPlaces;
    }),
  findPlaceSearch: publicProcedure
    .input(z.object({ query: z.string() })) // Input required for this procedure
    .query(async ({ input }) => {
      const places = await db.places.findMany({
        where: {
          name: {
            contains: input.query,
            mode: "insensitive",
          },
          isVerified: true,
        },
        take: 5, // Return only the top 5 results
      });
      return places;
    }),

  //Place Page

  findPlace: publicProcedure
    .input(z.object({ id: z.string() })) // Input required for this procedure
    .query(async ({ input }) => {
      const place = await db.places.findUnique({
        where: { place_id: input.id },
        include: {
          path: true,
          airportDetails: true,
          reviews: { include: { user: true } },
        },
      });
      return place;
    }),
  addReview: publicProcedure
    .input(
      z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        rating: z.number(),
        userId: z.string(),
        placeId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.review.create({
        data: {
          title: input.title,
          content: input.content,
          rating: input.rating,
          timestamp: new Date().toISOString(),
          userId: input.userId,
          placeId: input.placeId,
        },
      });
    }),

  //Account Page

  editUser: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          email: input.email,
        },
      });
    }),

  //My Places Page

  findSavedPlaces: publicProcedure
    .input(z.object({ id: z.string() })) // Input required for this procedure
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { id: input.id },
        include: {
          savedPlaces: {
            include: {
              airportDetails: true,
            },
          },
        },
      });
      return user;
    }),
  isPlaceSavedByUser: publicProcedure
    .input(z.object({ userId: z.string(), placeId: z.string() }))
    .query(async ({ input }) => {
      const count = await db.user.count({
        where: {
          id: input.userId,
          savedPlaces: {
            some: { place_id: input.placeId },
          },
        },
      });
      return count > 0; // true if saved, false otherwise
    }),
  savePlace: publicProcedure
    .input(z.object({ userId: z.string(), placeId: z.string() })) // Input required for this procedure
    .mutation(async ({ input }) => {
      await db.user.update({
        where: { id: input.userId },
        data: {
          savedPlaces: {
            connect: { place_id: input.placeId },
          },
        },
      });
    }),
  unsavePlace: publicProcedure
    .input(z.object({ userId: z.string(), placeId: z.string() })) // Input required for this procedure
    .mutation(async ({ input }) => {
      await db.user.update({
        where: { id: input.userId },
        data: {
          savedPlaces: {
            disconnect: { place_id: input.placeId },
          },
        },
      });
    }),
  findContributedPlaces: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const places = await db.places.findMany({
        where: {
          submittedUserId: input.userId,
        },
        include: {
          airportDetails: true,
        },
      });
      return places;
    }),

  //Contribute Page

  getClosestPath: publicProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number() }))
    .mutation(async ({ input }) => {
      const paths = await db.paths.findMany();
      let closestPath = null;
      let minDistance = Infinity;

      paths.forEach((path) => {
        path.latitude.forEach((lat, index) => {
          const lon = path.longitude[index];
          if (lat !== undefined && lon !== undefined) {
            const distance = calculateDistance(
              input.latitude,
              input.longitude,
              lat,
              lon,
            );

            if (distance < minDistance) {
              minDistance = distance;
              closestPath = path;
            }
          }
        });
      });

      return {
        path: closestPath,
        distance: minDistance,
      };
    }),

  getClosestAirport: publicProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number() }))
    .mutation(async ({ input }) => {
      const airports = await db.airports.findMany();
      let closestAirport = null;
      let minDistance = Infinity;

      airports.forEach((airport) => {
        const distance = calculateDistance(
          input.latitude,
          input.longitude,
          airport.latitude,
          airport.longitude,
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestAirport = airport;
        }
      });

      return {
        airport: closestAirport,
        distance: minDistance,
      };
    }),

  getAverageAltitude: publicProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        iataCode: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      interface CsvRow {
        lat: number;
        lng: number;
        alt: number;
        dep_iata: string;
        arr_iata: string;
      }

      const filePath = `src/server/api/opt/flightDataStore/flight_log_${input.iataCode}.csv`;
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return null;
      }
      console.log(`Reading file: ${filePath}`);
      return new Promise((resolve, reject) => {
        const results: CsvRow[] = [];
        const readStream = fs.createReadStream(filePath);
        const csvStream = csv();

        readStream.pipe(csvStream);

        csvStream.on("data", (data: CsvRow) => results.push(data));
        csvStream.on("end", () => {
          const filteredResults = results.filter((row) => {
            const distance = calculateDistance(
              input.latitude,
              input.longitude,
              row.lat,
              row.lng,
            );
            return distance <= 0.3;
          });

          const altitudes = filteredResults
            .map((item) => Number(item.alt))
            .sort((a, b) => a - b);

          const percentileThreshold = 50;

          const index = Math.floor(
            (altitudes.length * percentileThreshold) / 100,
          );

          // Get all altitudes below the calculated percentile
          const filteredAltitudes = altitudes.slice(0, index);

          // Calculate the average of these altitudes
          const averageAltitude =
            filteredAltitudes.reduce((sum, alt) => sum + alt, 0) /
            filteredAltitudes.length;

          resolve(averageAltitude);
        });

        csvStream.on("error", reject);
      });
    }),

  getNearbyPlaces: publicProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const places = await db.places.findMany();
      let nearbyPlaces = places.filter((place) => {
        const distance = calculateDistance(
          input.latitude,
          input.longitude,
          place.latitude,
          place.longitude,
        );
        return distance <= 0.15;
      });

      // Sort the nearby places by distance in ascending order
      nearbyPlaces = nearbyPlaces.sort((placeA, placeB) => {
        const distanceA = calculateDistance(
          input.latitude,
          input.longitude,
          placeA.latitude,
          placeA.longitude,
        );
        const distanceB = calculateDistance(
          input.latitude,
          input.longitude,
          placeB.latitude,
          placeB.longitude,
        );
        return distanceA - distanceB;
      });

      return nearbyPlaces;
    }),

  addPlace: publicProcedure
    .input(
      z.object({
        name: z.string(),
        address: z.string(),
        description: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        pathId: z.string().optional(),
        googleMapsURI: z.string().optional(),
        iataCode: z.string().optional(),
        distanceFromFlightpath: z.number().optional(),
        averageAltitude: z.number(),
        altitudeEstimated: z.boolean(),
        distanceFromAirport: z.number().optional(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.places.create({
        data: {
          name: input.name,
          address: input.address,
          description: input.description,
          latitude: input.latitude,
          longitude: input.longitude,
          path_id: input.pathId,
          google_maps_uri: input.googleMapsURI,
          airport: input.iataCode,
          distance_from_flightpath: input.distanceFromFlightpath,
          average_altitude: input.averageAltitude,
          altitude_estimated: input.altitudeEstimated,
          distance_from_airport: input.distanceFromAirport,
          isUserSubmitted: true,
          submittedUserId: input.userId,
          isVerified: false,
        },
      });
    }),

  //Submissions Page

  findSubmittedPlaces: publicProcedure
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      const places = await db.places.findMany({
        where: {
          isUserSubmitted: true,
          isVerified: false,
        },
        include: {
          airportDetails: true,
          submittedUser: true,
        },
      });
      return places;
    }),

  approvePlace: publicProcedure
    .input(z.object({ placeId: z.string() }))
    .mutation(async ({ input }) => {
      await db.places.update({
        where: { place_id: input.placeId },
        data: {
          isVerified: true,
        },
      });
    }),

  rejectPlace: publicProcedure
    .input(z.object({ placeId: z.string() }))
    .mutation(async ({ input }) => {
      await db.places.delete({
        where: { place_id: input.placeId },
      });
    }),
    
  updatePlace: publicProcedure
    .input(
      z.object({
        placeId: z.string(),
        name: z.string(),
        address: z.string(),
        description: z.string().optional(),
        pathId: z.string().optional(),
        googleMapsURI: z.string().optional(),
        iataCode: z.string().optional(),
        distanceFromFlightpath: z.number().optional(),
        averageAltitude: z.number(),
        altitudeEstimated: z.boolean().optional(),
        distanceFromAirport: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.places.update({
        where: { place_id: input.placeId },
        data: {
          name: input.name,
          address: input.address,
          description: input.description,
          path_id: input.pathId,
          google_maps_uri: input.googleMapsURI,
          airport: input.iataCode,
          distance_from_flightpath: input.distanceFromFlightpath,
          average_altitude: input.averageAltitude,
          altitude_estimated: input.altitudeEstimated,
          distance_from_airport: input.distanceFromAirport,
        },
      });
    }),
});
