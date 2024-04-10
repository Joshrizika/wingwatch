/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
    images: {
        domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com', 'maps.googleapis.com', 'places.googleapis.com', 'wingwatch.nyc3.cdn.digitaloceanspaces.com'],
      },
};

export default config;
