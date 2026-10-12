// import "maplibre-gl/dist/maplibre-gl.css";

import UgmNavigationTabs from "@/components/UGM/NavTabs";

export default function UgmLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="relative h-screen w-full">
            <div className="hidden sm:block absolute top-2 right-17 z-[95]">
                <UgmNavigationTabs />
            </div>
            <div className="block sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[95]">
                <UgmNavigationTabs />
            </div>
            {children}
        </main>
    );
}
