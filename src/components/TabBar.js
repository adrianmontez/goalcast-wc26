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
    <div className="fixed bottom-0 left-0">
      <div className="flex gap-0">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                active
                  ? "bg-white px-3 py-1 text-black font-semibold border border-white"
                  : "bg-black px-3 py-1 text-white font-semibold border border-white hover:bg-gray-800"
              }
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}