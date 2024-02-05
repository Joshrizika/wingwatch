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
});
