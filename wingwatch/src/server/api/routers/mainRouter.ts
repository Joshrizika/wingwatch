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
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      const places = await db.places.findMany();
      return places;
    }),
  // findTopPlaces: publicProcedure
  //   .input(z.void()) // No input required for this procedure
  //   .query(async () => {
  //     const places = await db.places.findMany();

  //     // Perform the calculation and sort the results
  //     const sortedPlaces = places
  //       .map((place) => ({
  //         ...place,
  //         value: Math.sqrt(
  //           Math.pow(place.distance_from_flightpath, 2) +
  //             Math.pow(place.average_altitude, 2),
  //         ),
  //       }))
  //       .sort((a, b) => a.value - b.value);
  //     return sortedPlaces;
  //   }),
  findClosestPlaces: publicProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number(), radius: z.number() })) // Input required for this procedure
    .query(async ({ input }) => {
      const places = await db.places.findMany();

      // Filter and sort places within a 50 mile radius
      const filteredAndSortedPlaces = places
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
        .sort((a, b) => a.distance - b.distance);

      return filteredAndSortedPlaces;
    }),
  findPlace: publicProcedure
    .input(z.object({ id: z.string() })) // Input required for this procedure
    .query(async ({ input }) => {
      const place = await db.places.findUnique({
        where: { place_id: input.id },
        include: { path: true, reviews: { include: { user: true } } },
      });
      return place;
    }),
  findPaths: publicProcedure
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      const paths = await db.paths.findMany();
      return paths;
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
