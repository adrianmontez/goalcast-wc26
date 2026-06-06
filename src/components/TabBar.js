"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { name: "Standings", href: "/standings", storageKey: "goalcast_last_standings_view" },
    { name: "Schedule", href: "/schedule", storageKey: "goalcast_last_schedule_view" },
    { name: "Predict", href: "/predict", storageKey: "goalcast_last_predict_view" },
  ];

  function handleTabClick(event, tab) {
    event.preventDefault();

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const currentParams = new URLSearchParams(window.location.search);
    const from = currentParams.get("from");

    // If you are currently on Teams and click the tab that originally sent you there,
    // go back to that main tab instead of reopening Teams.
    if (window.location.pathname === "/teams") {
      if (from === "standings" && tab.href === "/standings") {
        localStorage.setItem("goalcast_last_standings_view", "/standings");
        router.push("/standings");
        return;
      }

      if (from === "schedule" && tab.href === "/schedule") {
        localStorage.setItem("goalcast_last_schedule_view", "/schedule");
        router.push("/schedule");
        return;
      }

      if (from === "predict" && tab.href === "/predict") {
        localStorage.setItem("goalcast_last_predict_view", "/predict");
        router.push("/predict");
        return;
      }
    }

    const savedHref = localStorage.getItem(tab.storageKey);

    router.push(savedHref || tab.href);
  }

  return (
    <div className="fixed bottom-0 left-0 z-50">
      <div className="flex gap-0">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={(event) => handleTabClick(event, tab)}
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