import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getServerAuthSession } from "~/server/auth";

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
  findTopPlaces: publicProcedure
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      const places = await db.places.findMany();

      // Perform the calculation and sort the results
      const sortedPlaces = places
        .map((place) => ({
          ...place,
          value: Math.sqrt(
            Math.pow(place.distance_from_flightpath, 2) +
              Math.pow(place.average_altitude, 2),
          ),
        }))
        .sort((a, b) => a.value - b.value);
      return sortedPlaces;
    }),
  findClosestPlaces: publicProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number() })) // Input required for this procedure
    .query(async ({ input }) => {
      const places = await db.places.findMany();

      // Perform the calculation and sort the results
      const sortedPlaces = places
        .map((place) => ({
          ...place,
          value: Math.sqrt(
            Math.pow(place.latitude - input.latitude, 2) +
              Math.pow(place.longitude - input.longitude, 2),
          ),
        }))
        .sort((a, b) => a.value - b.value);

      return sortedPlaces;
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
          savedPlaces: true
        },
      });
      return user;
    }),
});
