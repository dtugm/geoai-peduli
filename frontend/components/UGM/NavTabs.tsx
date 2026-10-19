"use client";

import { Tabs, Tab } from "@heroui/react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function UgmNavigationTabs() {
    const router = useRouter();
    const pathname = usePathname();

    // Mapping path ke region
    const pathToRegionMap: Record<string, string> = {
        "/aceh": "aceh",
        "/acehDampak": "aceh",
        "/sumut": "sumut",
        "/sumbar": "sumbar",
    };

    // Fungsi untuk menentukan selectedKey berdasarkan pathname
    const getSelectedKey = () => {
        // Cek exact match dulu
        if (pathToRegionMap[pathname]) {
            return pathToRegionMap[pathname];
        }

        // Cek apakah pathname dimulai dengan salah satu region
        if (pathname.startsWith("/aceh")) {
            return "aceh";
        } else if (pathname.startsWith("/sumbar")) {
            return "sumbar";
        } else if (pathname.startsWith("/sumut")) {
            return "sumut";
        }

        // Default fallback
        return "sumut";
    };

    const selectedKey = getSelectedKey();

    const handleSelectionChange = (key: React.Key) => {
        router.push(`/${key}`);
    };

    return (
        <div className="flex w-full flex-col bg-gray-900/90 rounded-lg p-2">

            {/* Desktop version */}
            <div className="hidden sm:flex sm:items-center sm:gap-1">
                <Link href="/" aria-label="Beranda GeoAI Peduli" className="flex-shrink-0">
                    <Image
                        src="/geoait.png"
                        alt="Logo"
                        width={100}
                        height={30}
                        className="object-contain"
                    />
                </Link>
                <DesktopTabs
                    selectedKey={selectedKey}
                    handleSelectionChange={handleSelectionChange}
                />
            </div>

            {/* Mobile version */}
            <div className="flex sm:hidden items-center gap-2">
                <Link href="/" aria-label="Beranda GeoAI Peduli" className="flex-shrink-0">
                    <Image
                        src="/geoait.svg"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="object-contain flex-shrink-0"
                    />
                </Link>
                <MobileTabs
                    selectedKey={selectedKey}
                    handleSelectionChange={handleSelectionChange}
                />
            </div>
        </div>
    );
}

function DesktopTabs({ selectedKey, handleSelectionChange }: any) {
    return (
        <Tabs
            aria-label="Navigation tabs"
            selectedKey={selectedKey}
            onSelectionChange={handleSelectionChange}
            color="primary"
            classNames={{
                tabList: "bg-gray-800/60 rounded-lg",
                cursor: "bg-gradient-to-r from-primary to-brand",
                tab: "flex-1 justify-center data-[selected=true]:text-white",
                tabContent: "text-gray-200 font-medium",
            }}
        >
            <Tab key="aceh" title="Aceh" />
            <Tab key="sumut" title="Sumatera Utara" />
            <Tab key="sumbar" title="Sumatera Barat" />
        </Tabs>
    );
}

function MobileTabs({ selectedKey, handleSelectionChange }: any) {
    return (
        <Tabs
            aria-label="Mobile navigation"
            selectedKey={selectedKey}
            onSelectionChange={handleSelectionChange}
            size="sm"
            radius="full"
            color="primary"
            classNames={{
                tabList:
                    "bg-gray-800/80 rounded-full p-1 flex gap-1 overflow-x-auto no-scrollbar",
                cursor: "bg-gradient-to-r from-primary to-brand",
                tab:
                    "px-3 py-1 text-xs text-gray-300 data-[selected=true]:text-white whitespace-nowrap",
            }}
        >
            <Tab key="aceh" title="Aceh" />
            <Tab key="sumut" title="Sumut" />
            <Tab key="sumbar" title="Sumbar" />
        </Tabs>
    );
}
