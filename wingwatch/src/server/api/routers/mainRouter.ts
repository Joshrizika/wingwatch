import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getServerAuthSession } from "~/server/auth";


// add another router that generates random lucky numbers based on the user's inputted birth day plus some weather api data



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
      const sortedPlaces = places.map(place => ({
        ...place,
        value: Math.sqrt(Math.pow(place.distance_from_flightpath, 2) + Math.pow(place.average_altitude, 2))
      })).sort((a, b) => a.value - b.value);

      return sortedPlaces;
    }),
  findClosestPlaces: publicProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number() })) // Input required for this procedure
    .query(async ({ input }) => {
      const places = await db.places.findMany();

      // Perform the calculation and sort the results
      const sortedPlaces = places.map(place => ({
        ...place,
        value: Math.sqrt(Math.pow(place.latitude - input.latitude, 2) + Math.pow(place.longitude - input.longitude, 2))
      })).sort((a, b) => a.value - b.value);

      return sortedPlaces;
    }),
  findPlace: publicProcedure
    .input(z.object({ id: z.string() })) // Input required for this procedure
    .query(async ({ input }) => {
      const place = await db.places.findUnique({ where: { place_id: input.id }, include: { path: true, reviews: true}});
      return place;
    }),
  findPaths: publicProcedure
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      const paths = await db.paths.findMany();
      return paths;
    }),
});
