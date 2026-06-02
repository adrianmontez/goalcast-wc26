"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import TabBar from "@/components/TabBar";
import { groups } from "@/data/wc2026Data";

// Lower number = higher manual ranking if teams are still tied
const manualOrderOverrides = {
  // Example:
  // USA: 1,
  // CAN: 2,
  // MEX: 3,
};

function getManualOrder(team, index) {
  return manualOrderOverrides[team.abbr] ?? index + 1;
}

function sortStandingsTeams(teams) {
  return [...teams].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;

    return a.manualOrder - b.manualOrder;
  });
}

function buildInitialStandings(groups) {
  return groups.map((groupData) => ({
    group: groupData.group,
    teams: sortStandingsTeams(
      groupData.teams.map((team, index) => ({
        name: team.name,
        abbr: team.abbr,
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
        manualOrder: getManualOrder(team, index),
      }))
    ),
  }));
}

function addManualOrderAndSort(apiStandings) {
  return apiStandings.map((groupData) => {
    const hasApiRanks = groupData.teams.every(
      (team) => typeof team.rank === "number"
    );

    return {
      ...groupData,
      teams: hasApiRanks
        ? [...groupData.teams].sort((a, b) => a.rank - b.rank)
        : sortStandingsTeams(
            groupData.teams.map((team, index) => ({
              ...team,
              manualOrder: getManualOrder(team, index),
            }))
          ),
    };
  });
}

export default function Standings() {
  const [standings, setStandings] = useState(() => buildInitialStandings(groups));
  const [liveDataStatus, setLiveDataStatus] = useState("loading");
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(null);

  const [expandedStandingsGroups, setExpandedStandingsGroups] = useState({});
  const [expandedStandingsGroupsLoaded, setExpandedStandingsGroupsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveStandings() {
      try {
        const response = await fetch("/api/live/standings");
        const data = await response.json();

        if (cancelled) return;

        if (data.standings) {
          setStandings(addManualOrderAndSort(data.standings));
          setLiveUpdatedAt(data.updatedAt || null);
          setLiveDataStatus(data.ok ? "live" : "static");
        } else {
          setLiveDataStatus("static");
        }
      } catch (error) {
        console.error("Could not load live standings:", error);
        setLiveDataStatus("static");
      }
    }

    loadLiveStandings();

    const interval = setInterval(loadLiveStandings, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      const saved = localStorage.getItem("goalcast_expanded_standings_groups");

      if (cancelled) return;

      if (saved) {
        try {
          setExpandedStandingsGroups(JSON.parse(saved));
        } catch {
          setExpandedStandingsGroups({});
        }
      }

      setExpandedStandingsGroupsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!expandedStandingsGroupsLoaded) return;

    localStorage.setItem(
      "goalcast_expanded_standings_groups",
      JSON.stringify(expandedStandingsGroups)
    );
  }, [expandedStandingsGroups, expandedStandingsGroupsLoaded]);

  function toggleGroupExtraStats(groupKey) {
    setExpandedStandingsGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  return (
    <main className="relative min-h-screen bg-black text-white p-4 sm:p-6 pb-20 sm:pb-14">
      <div className="absolute top-4 right-4 h-[50px] w-[50px]">
        <Image
          src="/images/goalcast_trophy.png"
          alt="GoalCast Trophy"
          fill
          sizes="50px"
          className="object-contain"
        />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-6">GoalCast WC26</h1>

      <section className="mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3">
          Group Standings
        </h2>

        <p className="mb-6 text-xs text-gray-400">
          {liveDataStatus === "live"
            ? `Live standings connected${
                liveUpdatedAt
                  ? ` • Updated ${new Date(liveUpdatedAt).toLocaleTimeString()}`
                  : ""
              }`
            : liveDataStatus === "loading"
              ? "Loading live standings..."
              : "Using saved standings data"}
        </p>

        <div className="space-y-6">
          {standings.map((groupData) => {
            const groupExpanded = Boolean(expandedStandingsGroups[groupData.group]);

            const standingsTableWidthClass = groupExpanded
              ? "min-w-[560px] sm:min-w-[760px]"
              : "min-w-0";

            const standingsGridClass = groupExpanded
              ? "grid-cols-[2rem_5rem_repeat(8,minmax(2.25rem,1fr))] sm:grid-cols-[2rem_13rem_repeat(8,minmax(2.75rem,1fr))]"
              : "grid-cols-[2rem_5rem_repeat(5,minmax(2rem,1fr))] sm:grid-cols-[2rem_13rem_repeat(5,minmax(2.75rem,1fr))]";

            return (
              <div key={groupData.group}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-semibold">
                    Group {groupData.group}
                  </h3>

                  <button
                    type="button"
                    onClick={() => toggleGroupExtraStats(groupData.group)}
                    className="shrink-0 border border-gray-600 px-2 py-1 text-[10px] sm:text-xs text-gray-300 hover:bg-gray-800"
                  >
                    {groupExpanded ? "Hide" : "Expand"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtraStats((current) => !current)}
                  className="shrink-0 border border-gray-600 px-2 py-1 text-[10px] sm:text-xs text-gray-300 hover:bg-gray-800"
                >
                  {showExtraStats ? "Hide" : "Expand"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <div className={`${standingsTableWidthClass} w-full border border-white`}>
                  <div
                  className={`grid ${standingsGridClass} border-b border-white p-2 text-xs sm:text-sm font-bold`}
                >
                  <span></span>
                  <span>Team</span>
                  <span className="text-center">MP</span>
                  <span className="text-center">W</span>
                  <span className="text-center">D</span>
                  <span className="text-center">L</span>
                  <span className="text-center">Pts</span>

                  {groupExpanded && (
                    <>
                      <span className="text-center">GF</span>
                      <span className="text-center">GA</span>
                      <span className="text-center">GD</span>
                    </>
                  )}
                </div>

                  {groupData.teams.map((team) => (
                    <div
                      key={team.abbr}
                      className={`grid ${standingsGridClass} border-b border-gray-700 last:border-b-0 p-2 text-xs sm:text-sm items-center`}
                    >
                      <div className="flex items-center">
                        <Image
                          src={`/flags/${team.abbr}.png`}
                          alt={`${team.name} flag`}
                          width={24}
                          height={16}
                          className="object-cover"
                        />
                      </div>

                      <div className="font-semibold truncate pr-2">
                        <span className="hidden sm:inline">{team.name}</span>
                        <span className="sm:hidden">{team.abbr}</span>
                      </div>

                      <span className="text-center">{team.mp}</span>
                      <span className="text-center">{team.w}</span>
                      <span className="text-center">{team.d}</span>
                      <span className="text-center">{team.l}</span>
                      <span className="text-center font-bold">{team.pts}</span>

                      {groupExpanded && (
                        <>
                          <span className="text-center">{team.gf}</span>
                          <span className="text-center">{team.ga}</span>
                          <span className="text-center">{team.gd}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
                </div>
              );
            })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3">
          Knockout Bracket
        </h2>

        <div className="border border-white p-3 sm:p-4 text-sm sm:text-base">
          Bracket will appear here after group play.
        </div>
      </section>

      <TabBar />
    </main>
  );
}