import Image from "next/image";

export default function Loading({ text }: { text?: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-2">
      <Image
        src="/LoadingAnimation.gif"
        alt="Loading Animation"
        width={100}
        height={100}
      />
      {text && <p>{text}</p>}
    </div>
  );
}
