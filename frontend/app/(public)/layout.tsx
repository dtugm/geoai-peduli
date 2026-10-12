// import "maplibre-gl/dist/maplibre-gl.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main>{children}</main>
      </div>
    </div>
  );
}
