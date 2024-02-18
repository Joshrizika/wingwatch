"use client";

import { useEffect } from "react";
import Navbar from "../_components/Navbar";
import { unstable_noStore as noStore } from "next/cache";
// import Link from 'next/link';
import Image from "next/image";
import { useState } from "react";

interface Document {
  name: string;
  path: string;
  thumbnail: string;
}

interface DocumentModalProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
}

const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  content,
  onClose,
}) => {
  useEffect(() => {
    const handleEscapeKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscapeKeyPress);
    }
    return () => {
      window.removeEventListener("keydown", handleEscapeKeyPress);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null; // Ensure modal is not rendered when isOpen is false

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="h-5/6 w-full max-w-3xl overflow-hidden rounded-lg bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {content && (
          <iframe
            src={content}
            frameBorder="0"
            className="h-full w-full"
          ></iframe>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-blue-500 px-4 py-2 text-white transition duration-150 ease-in-out hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Place() {
  noStore();

  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const documents: Document[] = [
    {
      name: "Elevator Pitch",
      path: "/writings/Wing Watch Elevator Pitch.pdf",
      thumbnail: "/writings/thumbnails/Writing 1 Thumbnail.png",
    },
    {
      name: "Project Design",
      path: "/writings/Wing Watch Essay 2.pdf",
      thumbnail: "/writings/thumbnails/Writing 2 Thumbnail.png",
    },
    {
      name: "Project Description",
      path: "/writings/Team Josh Project Description.pdf",
      thumbnail: "/writings/thumbnails/Writing 3 Thumbnail.png",
    },
    {
      name: "Final Design Document",
      path: "/writings/Team Josh Writing 4.pdf",
      thumbnail: "/writings/thumbnails/Writing 4 Thumbnail.png",
    },
  ];

  const handleDocumentClick = (documentPath: string) => {
    setSelectedDocument(documentPath);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Navbar />

      <div className="mx-auto max-w-4xl p-4">
        <section className="mb-8">
          <h2 className="mb-2 text-2xl font-bold">Project Description</h2>
          <p className="text-gray-700">
            Wing Watch is an innovative app designed to help users find the best
            locations for plane spotting. It tracks and organizes flight path
            data, making it easy to identify prime locations for watching
            planes.
          </p>
        </section>

        <section className="mb-8 flex">
          <div className="mr-4 flex-shrink-0">
            <div className="relative mr-4 h-48 w-48 flex-shrink-0">
              {" "}
              {/* Adjust the height and width as needed */}
              <Image
                src="/headshot.jpg"
                alt="Your Description"
                layout="fill"
                objectFit="cover"
                className="rounded"
              />
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-2xl font-bold">About Me</h2>
            <p className="text-gray-700">
              Joshua Rizika is a graduating senior from George Washington
              University, with a keen interest in aviation. Throughout the
              development of this app, I&apos;ve had the opportunity to dive
              deep into flight path data, combining my academic background and
              personal interests. Working with data on this project has been
              incredibly rewarding, allowing me to uncover the best spots for
              plane spotting enthusiasts like myself. I hope Wing Watch helps
              you find your next great viewing location and enhances your love
              for aviation as much as it has for me.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-2xl font-bold">GitHub</h2>
          <p className="text-gray-700">
            Visit our{" "}
            <a
              href="https://github.com/GW-CS-SD-23-24/sd-team-josh"
              className="text-blue-600 transition duration-150 ease-in-out hover:text-blue-800"
            >
              GitHub
            </a>{" "}
            to learn more about the algorithms and structure that made this
            project possible.
          </p>
        </section>

        <section className="mb-8 text-center">
          <h2 className="mb-4 text-2xl font-bold">Documents</h2>
          <div className="flex justify-center gap-4">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="relative h-80 w-60 cursor-pointer overflow-hidden rounded-lg shadow-lg transition-shadow duration-300 ease-in-out hover:shadow-xl"
                onClick={() => handleDocumentClick(doc.path)}
              >
                <Image
                  src={doc.thumbnail}
                  alt={`Preview of ${doc.name}`}
                  layout="fill"
                  objectFit="cover"
                  className="transition-opacity duration-300 ease-in-out hover:opacity-75"
                />
                <p className="absolute bottom-0 mt-2 w-full bg-white bg-opacity-75 p-1 text-sm">
                  {doc.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        <DocumentModal
          isOpen={isModalOpen}
          content={selectedDocument ?? ""}
          onClose={closeModal}
        />
      </div>
    </>
  );
}
