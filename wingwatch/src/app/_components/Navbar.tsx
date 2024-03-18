import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "~/trpc/react";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const session = api.main.getSession.useQuery().data;
  console.log(session);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-white shadow" style={{ zIndex: 10 }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center space-x-4">
          <Link href="/" passHref>
            <span>
              <Image src="/favicon.ico" alt="Logo" width={32} height={32} />
            </span>
          </Link>
          <Link href="/" passHref>
            <span className="cursor-pointer text-xl font-bold text-gray-800">
              Wing Watch
            </span>
          </Link>
          <SearchBar />
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/explore" passHref>
            <span className="text-gray-800 transition duration-300 ease-in-out hover:text-blue-500">
              Explore
            </span>
          </Link>
          {session && (
            <Link href="/saved" passHref>
              <span className="text-gray-800 transition duration-300 ease-in-out hover:text-blue-500">
                My Places
              </span>
            </Link>
          )}
          {session && (
            <Link href="/contribute" passHref>
              <span className="text-gray-800 transition duration-300 ease-in-out hover:text-blue-500">
                Contribute
              </span>
            </Link>
          )}
          <Link href="/about" passHref>
            <span className="text-gray-800 transition duration-300 ease-in-out hover:text-blue-500">
              About Us
            </span>
          </Link>
          <div className="relative inline-block text-left" ref={dropdownRef}>
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex cursor-pointer items-center space-x-2"
            >
              <Image
                src={session ? session.user.image! : "/user.png"}
                alt="User"
                width={32}
                height={32}
                className="rounded-full"
              />
            </div>
            {dropdownOpen && (
              <div
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-button"
              >
                <div className="py-1" role="none">
                  {session && (
                    <Link href="/account" passHref>
                      <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Account
                      </span>
                    </Link>
                  )}
                  {session?.user.isAdmin && (
                    <Link href="/approvals" passHref>
                      <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Approve places
                      </span>
                    </Link>
                  )}
                  <Link
                    href={session ? "/api/auth/signout" : "/api/auth/signin"}
                    passHref
                  >
                    <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      {session ? "Sign out" : "Sign in"}
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
