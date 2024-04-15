import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Image
        src="/LoadingAnimation.gif"
        alt="Loading Animation"
        width={100}
        height={100}
      />
    </div>
  );
}
