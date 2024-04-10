import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getServerAuthSession } from "~/server/auth";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import aws from "aws-sdk";

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

const base64ToBuffer = (base64String: string): Buffer => {
  const arr = base64String.split(",");
  const bstr = atob(arr[1]!);
  let n = bstr.length;
  const buffer = new Uint8Array(n);

  while (n--) {
    buffer[n] = bstr.charCodeAt(n);
  }

  return Buffer.from(buffer);
};

async function uploadImage(
  file: Buffer,
  imageId: string,
  reviewId: string,
  placeId: string,
  type: string,
) {
  const endpoint = new aws.Endpoint("nyc3.digitaloceanspaces.com");
  const s3 = new aws.S3({
    endpoint: endpoint,
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
    region: "nyc3",
    signatureVersion: "v4",
  });

  const params = {
    Bucket: "wingwatch",
    Key: `${placeId}/${reviewId}/${imageId}.${type.split('/')[1]}`,
    Body: file,
    ACL: "public-read",
  };
  try {
    await s3.upload(params).promise();
  } catch (error) {
    console.error(
      "Error uploading image for reviewId:",
      reviewId,
      "Error:",
      error,
    );
    // deleteReviewMutation.mutate({ id: reviewId });
    await db.review.delete({
      where: { id: reviewId },
    });
  }
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
      // Find airports with verified places
      const verifiedAirports = await db.airports.findMany({
        where: {
          places: {
            some: {
              isVerified: true,
            },
          },
        },
      });

      // Fetch all paths in a separate query
      const paths = await db.paths.findMany();

      // Get all airports to check against the paths
      const allAirports = await db.airports.findMany();

      // Filter airports based on path_id matching with iata_code
      const airportsWithMatchingPaths = allAirports.filter((airport) =>
        paths.some((path) => path.path_id.startsWith(airport.iata_code)),
      );

      // Combine the two airport lists (verified and matching paths) while removing duplicates
      const combinedAirports = [
        ...verifiedAirports,
        ...airportsWithMatchingPaths,
      ].filter(
        (value, index, self) =>
          self.findIndex((t) => t.airport_id === value.airport_id) === index,
      );

      return combinedAirports;
    }),

  //Explore Page
  findPlaces: publicProcedure
    .input(z.void()) // No input required for this procedure
    .query(async () => {
      const places = await db.places.findMany({
        where: {
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
      const newReview = await db.review.create({
        data: {
          title: input.title,
          content: input.content,
          rating: input.rating,
          timestamp: new Date().toISOString(),
          userId: input.userId,
          placeId: input.placeId,
        },
        select: {
          id: true,
        },
      });
      return newReview;
    }),

  addImage: publicProcedure
    .input(
      z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
        height: z.number(),
        width: z.number(),
        placeId: z.string(),
        reviewId: z.string(),
        file: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const createdImage = await db.image.create({
        data: {
          name: input.name,
          size: input.size,
          type: input.type,
          height: input.height,
          width: input.width,
          placeId: input.placeId,
          reviewId: input.reviewId,
        },
        select: {
          id: true,
        },
      });
      const imageId = createdImage.id;
      const file = base64ToBuffer(input.file);
      await uploadImage(file, imageId, input.reviewId, input.placeId, input.type);
    }),

  getPlaceImages: publicProcedure
    .input(z.object({ placeId: z.string() }))
    .query(async ({ input }) => {
      const images = await db.image.findMany({
        where: { placeId: input.placeId },
        include: {
          review: {
            include: {
              user: true,
            },
          },
        },
      });
      return images;
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
  deleteUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.user.delete({
        where: { id: input.id },
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

      const basePath = path.join(
        process.cwd(),
        "src",
        "server",
        "api",
        "opt",
        "flightDataStore",
      );

      const filePath = path.join(basePath, `flight_log_${input.iataCode}.csv`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
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
          path: true,
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
        description: z.string().nullable(),
        pathId: z.string().nullable(),
        googleMapsURI: z.string().nullable(),
        iataCode: z.string().nullable(),
        distanceFromFlightpath: z.number().nullable(),
        averageAltitude: z.number(),
        altitudeEstimated: z.boolean(),
        distanceFromAirport: z.number().nullable(),
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
