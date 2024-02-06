"use client"

import { api } from "~/trpc/react";
import Link from "next/link";

export default function Navbar() {

    const session = api.main.getSession.useQuery().data;
    
    return (
        <nav className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/" passHref>
              <span className="cursor-pointer text-xl font-bold text-gray-800">Wing Watch</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/explore" passHref>
              <span className="cursor-pointer text-gray-800 hover:text-blue-500 transition duration-300 ease-in-out">Explore</span>
            </Link>
            <Link
              href={session ? "/api/auth/signout" : "/api/auth/signin"}
              passHref
            >
              <button className="rounded-full bg-blue-500 px-4 py-2 text-white font-semibold no-underline transition duration-300 ease-in-out hover:bg-blue-600">
                {session ? "Sign out" : "Sign in"}
              </button>
            </Link>
          </div>
        </div>
      </nav>
    )
}