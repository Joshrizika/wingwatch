"use client";

import Navbar from "../_components/Navbar";
import { api } from "~/trpc/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Account() {
  const router = useRouter();
  const { data: session, isLoading } = api.main.getSession.useQuery();
  const editUserMutation = api.main.editUser.useMutation();
  const deleteUserMutation = api.main.deleteUser.useMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [popUpOpen, setPopUpOpen] = useState(false);

  // Update state when session data is loaded
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default form submission behavior
    if (session?.user?.id) {
      editUserMutation.mutate(
        {
          id: session.user.id,
          name: name,
          email: email,
        },
        {
          onSuccess: () => {
            alert("Profile updated successfully!");
            // Optionally, redirect the user or refresh data here
          },
          onError: (error) => {
            console.error("Failed to update profile:", error);
            alert("Failed to update profile. Please try again.");
          },
        },
      );
    } else {
      console.error("Session or user ID is undefined");
      alert("Failed to update profile. Session or user ID is missing.");
    }
  };

  const handleDelete = async () => {
    if (session && session.user && session.user.id) {
      await deleteUserMutation.mutateAsync({ id: session.user.id });
      router.push("/");
    }
  };

  // Optionally show a loading state or prevent form display until session data is loaded
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div>
        <Navbar />
        <div className="mt-10 flex flex-col items-center">
          <h1 className="mb-5 text-4xl font-bold">Edit Account</h1>
          <form className="w-full max-w-xs" onSubmit={handleUpdate}>
            <div className="mb-6">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Update Profile
            </button>
            <button
              type="button"
              onClick={() => setPopUpOpen(true)}
              className="mt-4 flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete Account
            </button>
          </form>
        </div>
      </div>
      {popUpOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "5px",
              position: "relative",
            }}
          >
            <button
              onClick={() => {
                setPopUpOpen(false);
              }}
              style={{
                position: "absolute",
                right: "10px",
                top: "10px",
                border: "none",
                background: "transparent",
                fontSize: "1.5em",
              }}
            >
              &times;
            </button>
            <p style={{textAlign: "center", fontWeight: "bold"}}>Are you sure?</p>
            <p style={{textAlign: "center", fontWeight: "bold"}}>This action cannot be undone.</p>
            <button
              type="button"
              onClick={() => handleDelete()}
              className="mt-4 flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}
    </>
  );
}
