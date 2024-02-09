import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from "~/trpc/react";

export default function Navbar() {
  const session = api.main.getSession.useQuery().data;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-white shadow" style={{ position: 'relative', zIndex: 1000 }}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" passHref>
            <span><Image src="/favicon.ico" alt="Logo" width={32} height={32} /></span>
          </Link>
          <Link href="/" passHref>
            <span className="cursor-pointer text-xl font-bold text-gray-800">Wing Watch</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/explore" passHref><span className="text-gray-800 hover:text-blue-500 transition duration-300 ease-in-out">Explore</span></Link>
          {session && (
            <Link href="/saved" passHref><span className="text-gray-800 hover:text-blue-500 transition duration-300 ease-in-out">Saved</span></Link>
          )}
          {session && (
            <Link href="/contribute" passHref><span className="text-gray-800 hover:text-blue-500 transition duration-300 ease-in-out">Contribute</span></Link>
          )}
          <div className="relative inline-block text-left" ref={dropdownRef}>
            <div onClick={() => setDropdownOpen(!dropdownOpen)} className="cursor-pointer flex items-center space-x-2">
              <Image src="/user.png" alt="User" width={32} height={32} />
            </div>
            {dropdownOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
                <div className="py-1" role="none">
                  {session && (
                    <Link href="/account" passHref>
                      <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Manage Account</span>
                    </Link>
                  )}
                  <Link href={session ? "/api/auth/signout" : "/api/auth/signin"} passHref>
                    <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{session ? "Sign out" : "Sign in"}</span>
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
