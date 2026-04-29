"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabBar() {
  const pathname = usePathname();

  const tabs = [
    { name: "Standings", href: "/standings" },
    { name: "Schedule", href: "/schedule" },
    { name: "Predict", href: "/predict" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white sm:right-auto sm:border-r">
      <div className="grid grid-cols-3 sm:flex sm:gap-0">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                active
                  ? "bg-white px-2 py-3 text-center text-xs font-semibold text-black border-r border-white sm:px-4 sm:py-2 sm:text-sm"
                  : "bg-black px-2 py-3 text-center text-xs font-semibold text-white border-r border-white hover:bg-gray-800 sm:px-4 sm:py-2 sm:text-sm"
              }
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}