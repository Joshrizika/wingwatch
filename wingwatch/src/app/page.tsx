"use client";

import { api } from "~/trpc/react";
import Navbar from "./_components/Navbar";
import { Analytics } from "@vercel/analytics/react";
import Loading from "./_components/Loading";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const sessionQuery = api.main.getSession.useQuery();
  const router = useRouter();

  if (sessionQuery.isLoading) {
    return <Loading />;
  }

  return (
    <>
      <Analytics />
      <div className="fixed inset-0 -z-10">
        <Image
          src="/LandingPageHeader.png"
          alt="Landing Page Header"
          layout="fill"
          objectFit="cover"
          objectPosition="center top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#ffffff80] opacity-75"></div>
      </div>
      <div className="relative flex min-h-screen flex-col items-start justify-start gap-[100px]">
        <div className="ml-[100px] mt-[170px] self-start">
          <p className="font-roboto text-6xl text-white">
            Welcome to Wing Watch
          </p>
        </div>
        <div
          className="flex w-full justify-around p-10"
          style={{ minHeight: "60vh" }}
        >
          <div
            onClick={() => router.push("/explore")}
            className="flex w-[30vw] transform cursor-pointer flex-col justify-between rounded-2xl bg-white p-5 shadow-xl transition-transform duration-300 ease-in-out hover:scale-105"
          >
            <div>
              <h2 className="text-center text-2xl font-bold">Explore</h2>
              <p className="text-center text-lg">
                Discover new planespotting locations. Refine your results with
                custom filters and sorting options to find the perfect spot.{" "}
              </p>
            </div>
            <div
              className="flex items-center justify-center"
              style={{ marginTop: "10px" }}
            >
              <Image
                src="/ExplorePreview.png"
                alt="Explore Preview"
                width={1000}
                height={1000}
                className="rounded-2xl"
              />
            </div>
          </div>
          <div
            onClick={() => router.push("/contribute")}
            className="w-[30vw] transform cursor-pointer rounded-2xl bg-white p-6 shadow-xl transition-transform duration-300 ease-in-out hover:scale-105"
          >
            <h2 className="text-center text-2xl font-bold">Add a Place</h2>
            <p className="text-center text-lg">
              Don&apos;t see your favorite spot? Submit it to be added to our
              database.
            </p>
            <div
              className="justify-cente flex items-center rounded-2xl"
              style={{ marginTop: "40px" }}
            >
              <Image
                src="/SubmitPreview.jpg"
                alt="Submit Preview"
                width={1000}
                height={1000}
                className="rounded-2xl"
              />
            </div>
          </div>
          <div
            onClick={() => router.push("/about")}
            className="w-[30vw] transform cursor-pointer rounded-2xl bg-white p-6 shadow-xl transition-transform duration-300 ease-in-out hover:scale-105"
          >
            <h2 className="text-center text-2xl font-bold">About</h2>
            <p className="text-center text-lg">
              Learn more about Wing Watch and it&apos;s creation, exploring the
              innovative features that make it the go-to resource for
              planespotters.
            </p>
            <div
              className="flex items-center justify-center"
              style={{ marginTop: "10px" }}
            >
              <Image
                src="/AboutPreview.png"
                alt="About Preview"
                width={1000}
                height={1000}
                className="rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed left-0 top-0 z-50 w-full shadow-lg">
        <Navbar trans={true} />
      </div>
    </>
  );
}
