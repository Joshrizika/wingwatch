export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-12 w-12 mb-4"></div>
      <h1 className="text-lg text-gray-700">Loading...</h1>
    </div>
  );
}
