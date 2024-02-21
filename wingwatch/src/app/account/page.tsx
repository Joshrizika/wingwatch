"use client"

import Navbar from "../_components/Navbar";
import { api } from "~/trpc/react";
import { useState, useEffect } from "react";

export default function Account() {
  const { data: session, isLoading } = api.main.getSession.useQuery();
  const editUserMutation = api.main.editUser.useMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Update state when session data is loaded
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? '');
      setEmail(session.user.email ?? '');
    }
  }, [session]);
  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission behavior
    if (session?.user?.id) {
      editUserMutation.mutate({
        id: session.user.id,
        name: name,
        email: email,
      }, {
        onSuccess: () => {
          alert('Profile updated successfully!');
          // Optionally, redirect the user or refresh data here
        },
        onError: (error) => {
          console.error("Failed to update profile:", error);
          alert('Failed to update profile. Please try again.');
        },
      });
    } else {
      console.error("Session or user ID is undefined");
      alert('Failed to update profile. Session or user ID is missing.');
    }
  };

  // Optionally show a loading state or prevent form display until session data is loaded
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="mt-10 flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-5">Edit Account</h1>
        <form className="w-full max-w-xs" onSubmit={handleUpdate}>
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
}
