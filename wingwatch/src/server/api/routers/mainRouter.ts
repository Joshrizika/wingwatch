import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getServerAuthSession } from "~/server/auth";

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
        where: whereClause,
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
        include: { reviews: true, path: true, airportDetails: true },
      });

      // Filter and sort places within a 50 mile radius
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
        .filter((place) => place.distance <= input.radius) // Keep only places within 50 miles
        .filter((place) => !input.pathId || place.path.path_id === input.pathId) // Filter by pathId if provided
        .filter(
          (place) =>
            !input.iata_code ||
            place.airportDetails.iata_code === input.iata_code,
        ); // Filter by iata_code if provided

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
              Math.pow(a.distance_from_flightpath, 2),
          );
          const bValue = Math.sqrt(
            Math.pow(b.average_altitude, 2) +
              Math.pow(b.distance_from_flightpath, 2),
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
        },
        take: 5, // Return only the top 5 results
      });
      return places;
    }),
  findPlace: publicProcedure
    .input(z.object({ id: z.string() })) // Input required for this procedure
    .query(async ({ input }) => {
      const place = await db.places.findUnique({
        where: { place_id: input.id },
        include: { path: true, airportDetails: true, reviews: { include: { user: true } } },
      });
      return place;
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
            some: {},
          },
        },
      });
      return airports;
    }),
  addReview: publicProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
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
  findSavedPlaces: publicProcedure
    .input(z.object({ id: z.string() })) // Input required for this procedure
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { id: input.id },
        include: {
          savedPlaces: true,
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
});
