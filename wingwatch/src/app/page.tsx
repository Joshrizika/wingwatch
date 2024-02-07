"use client"

import { unstable_noStore as noStore } from "next/cache";
import { api } from "~/trpc/react";
import Navbar from "./_components/Navbar";
import useLocation from "./hooks/useLocation";

export default function Home() {
  noStore();
  const session = api.main.getSession.useQuery().data;

  const { location, error } = useLocation();
  
  

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="text-center">
          <p className="text-2xl text-black">
            {session && <span>Logged in as {session.user?.name}</span>}
          </p>
        </div>
      </main>
    </>
  );
      }