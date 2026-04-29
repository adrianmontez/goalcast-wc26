"use client";

import { useState } from "react";
import Image from "next/image";
import TabBar from "@/components/TabBar";
import { matches } from "@/data/wc2026Data";

export default function Schedule() {
  const [openMatches, setOpenMatches] = useState({});

  function toggleMatch(matchId) {
    setOpenMatches((currentOpenMatches) => ({
      ...currentOpenMatches,
      [matchId]: !currentOpenMatches[matchId],
    }));
  }

  const groupedMatches = matches.reduce((acc, match) => {
    if (!acc[match.group]) acc[match.group] = [];
    acc[match.group].push(match);
    return acc;
  }, {});

  const groupKeys = Object.keys(groupedMatches).sort();

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 pb-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Match Schedule</h1>

      <p className="text-sm text-gray-400 mb-6">
        This page will be updated closer to the start of the tournament!
      </p>

      <div className="space-y-8">
        {groupKeys.map((group) => (
          <section key={group} className="space-y-3">
            <div className="pb-2 border-b border-white">
              <h2 className="text-lg sm:text-xl font-semibold">Group {group}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
              {groupedMatches[group].map((match) => (
                <div key={match.id} className="border border-gray-700 p-3">
                  <p className="text-[11px] text-gray-400 mb-2">
                    {match.date}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Image
                        src={`/flags/${match.home}.png`}
                        alt={`${match.home} flag`}
                        width={28}
                        height={20}
                        className="object-cover"
                      />
                      <span className="font-semibold truncate">
                        {match.home}
                      </span>
                    </div>

                    <span className="text-xs text-gray-400 shrink-0">vs</span>

                    <div className="flex items-center justify-end gap-2 min-w-0">
                      <span className="font-semibold truncate">
                        {match.away}
                      </span>
                      <Image
                        src={`/flags/${match.away}.png`}
                        alt={`${match.away} flag`}
                        width={28}
                        height={20}
                        className="object-cover"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => toggleMatch(match.id)}
                    className="mt-2 text-xs text-gray-300 underline"
                  >
                    {openMatches[match.id] ? "Hide details" : "Show details"}
                  </button>

                  {openMatches[match.id] && (
                    <div className="mt-2 border-t border-gray-700 pt-2 text-xs text-gray-300">
                      <p>Time: {match.time}</p>
                      <p>Stadium: {match.stadium}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <TabBar />
    </main>
  );
}