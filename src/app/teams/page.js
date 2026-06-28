"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { groups } from "@/data/wc2026Data";
import { teamMeritsByName } from "@/data/teamMerits";
import TabBar from "@/components/TabBar";
import { useEffect, useState } from "react";
import { teamRostersByName } from "@/data/teamRosters";

function getAllTeams() {
  return groups
    .flatMap((group) =>
      group.teams.map((team) => ({
        ...team,
        group: group.group,
        merits: teamMeritsByName[team.name] || null,
        roster: teamRostersByName[team.name]?.players || [],
        manager: teamRostersByName[team.name]?.manager || null,
      }))
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderWorldCupStars(count) {
  const wins = Number(count || 0);

  if (wins <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: wins }).map((_, index) => (
        <Image
          key={index}
          src="/images/goalcast_star.png"
          alt="World Cup win"
          width={22}
          height={22}
          className="object-contain"
        />
      ))}
    </div>
  );
}

function renderConfederationBadge(merits) {
  const rank = Number(merits?.confederationRank || 0);

  if (!merits?.confederation || rank === 0) {
    return null;
  }

  const badgeClass =
    rank === 1
      ? "border-yellow-400 bg-yellow-500/20 text-yellow-300"
      : rank === 2
        ? "border-gray-300 bg-gray-400/20 text-gray-200"
        : "border-amber-700 bg-amber-800/30 text-amber-300";

  const label =
    rank === 1
      ? `${merits.confederation} Champion`
      : rank === 2
        ? `${merits.confederation} Runner-up`
        : `${merits.confederation} 3rd Place`;

  return (
    <span
      className={`rounded-full border px-2 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide ${badgeClass}`}
    >
      {label}
    </span>
  );
}

function renderDebutBadge(merits) {
  if (Number(merits?.debut || 0) !== 1) return null;

  return (
    <span className="rounded-full border border-purple-400 bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-300">
      Debut
    </span>
  );
}

function renderHostBadge(merits) {
  const hostValue = Number(merits?.host || 0);

  if (hostValue === 0) return null;

  const hostStyles = {
    1: "border-red-400 bg-red-500/20 text-red-300",
    2: "border-green-400 bg-green-500/20 text-green-300",
    3: "border-blue-400 bg-blue-500/20 text-blue-300",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        hostStyles[hostValue] || "border-gray-400 bg-gray-500/20 text-gray-300"
      }`}
    >
      Host
    </span>
  );
}

function groupPlayersByPosition(players) {
  const positionOrder = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

  return positionOrder
    .map((position) => ({
      position,
      players: players.filter((player) => player.position === position),
    }))
    .filter((group) => group.players.length > 0);
}

export default function TeamsPage() {
  const router = useRouter();
  const teams = getAllTeams();
  const [openTeams, setOpenTeams] = useState({});
  const [openTeamsLoaded, setOpenTeamsLoaded] = useState(false);
  
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace("#", "");

    if (!hash) return;

    const scrollToTeam = () => {
      const teamElement = document.getElementById(hash);

      if (!teamElement) return;

      const yOffset = -12;
      const y =
        teamElement.getBoundingClientRect().top + window.scrollY + yOffset;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    };

    const timeout = setTimeout(scrollToTeam, 250);

    return () => clearTimeout(timeout);
  }, []);

  const alphabetLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const availableLetters = Array.from(
    new Set(teams.map((team) => team.name[0]?.toUpperCase()))
  ).filter((letter) => alphabetLetters.includes(letter));

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const from = params.get("from");

        const currentTeamsUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

        if (from === "schedule") {
            localStorage.setItem("goalcast_last_schedule_view", currentTeamsUrl);
        }

        if (from === "standings") {
            localStorage.setItem("goalcast_last_standings_view", currentTeamsUrl);
        }

        if (from === "predict") {
            localStorage.setItem("goalcast_last_predict_view", currentTeamsUrl);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        Promise.resolve().then(() => {
            const saved = localStorage.getItem("goalcast_open_team_rosters");

            if (cancelled) return;

            if (saved) {
                try {
                    setOpenTeams(JSON.parse(saved));
                } catch {
                    setOpenTeams({});
                }
            }

            setOpenTeamsLoaded(true);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!openTeamsLoaded) return;

        localStorage.setItem(
            "goalcast_open_team_rosters",
            JSON.stringify(openTeams)
        );
    }, [openTeams, openTeamsLoaded]);

    function toggleTeam(teamAbbr) {
      setOpenTeams((current) => ({
        ...current,
        [teamAbbr]: !current[teamAbbr],
      }));
    }

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 pb-20">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Teams
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            View each team&apos;s roster, FIFA ranking, and tournament merits.
          </p>
        </div>

        <button
            type="button"
            onClick={() => {
                if (window.history.length > 1) {
                    router.back();
                } else {
                    router.push("/standings");
                }
            }}
            className="shrink-0 border border-white px-3 py-2 text-xs sm:text-sm font-semibold hover:bg-gray-800"
        >
            Back
        </button>
      </div>
      <nav
        aria-label="Team alphabet navigation"
        className="fixed right-1 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-full border border-gray-700 bg-black/80 px-1 py-2"
      >
        {alphabetLetters.map((letter) => {
            const isAvailable = availableLetters.includes(letter);

            return isAvailable ? (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white hover:bg-gray-700 sm:h-5 sm:w-5 sm:text-[10px]"
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-gray-700 sm:h-5 sm:w-5 sm:text-[10px]"
              >
                {letter}
              </span>
            );
        })}
      </nav>

      <section className="space-y-3 pr-6 sm:pr-8">
        {teams.map((team, index) => {
          const merits = team.merits;
          const firstLetter = team.name[0].toUpperCase();
          const previousFirstLetter =
            index > 0 ? teams[index - 1].name[0].toUpperCase() : null;
          const shouldAddLetterAnchor = firstLetter !== previousFirstLetter;

        return (
          <div key={team.abbr} className="relative">
            {shouldAddLetterAnchor && (
              <span
                id={`letter-${firstLetter}`}
                className="absolute -top-4"
                aria-hidden="true"
              />
            )}

            <article
              id={team.abbr}
              className="scroll-mt-16 border border-gray-700"
            >
              <button
                type="button"
                onClick={() => toggleTeam(team.abbr)}
                className="w-full p-3 text-left sm:p-4"
              >
              <div className="flex items-center gap-3">
                <Image
                  src={`/flags/${team.abbr}.png`}
                  alt={`${team.name} flag`}
                  width={34}
                  height={24}
                  className="object-cover shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base sm:text-lg font-bold">
                    {team.name}
                  </h2>

                  <p className="text-xs text-gray-400">
                    {team.abbr} • Group {team.group}
                  </p>
                </div>

                <div className="hidden sm:flex flex-1 items-center justify-center gap-2">
                    {renderWorldCupStars(merits?.worldCupWins)}
                    {renderHostBadge(merits)}
                    {renderDebutBadge(merits)}
                    {renderConfederationBadge(merits)}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[10px] uppercase text-gray-500">
                    FIFA Rank
                  </p>

                  <p className="text-lg sm:text-xl font-bold">
                    {merits?.fifaRank ?? "N/A"}
                  </p>

                  <p className="text-[10px] text-gray-500">
                    {openTeams[team.abbr] ? "Hide roster" : "View roster"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
                {renderWorldCupStars(merits?.worldCupWins)}
                {renderHostBadge(merits)}
                {renderDebutBadge(merits)}
                {renderConfederationBadge(merits)}
              </div>
              </button>
              {openTeams[team.abbr] && (
                <div className="border-t border-gray-700 p-3 sm:p-4">
                    <h3 className="mb-3 text-sm font-semibold text-gray-300">
                      Roster
                    </h3>

                    {team.roster.length > 0 ? (
                        <div className="space-y-4">
                            {groupPlayersByPosition(team.roster).map((positionGroup) => (
                            <div key={`${team.abbr}-${positionGroup.position}`}>
                                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                                {positionGroup.position}s
                                </h4>

                                <div className="space-y-2">
                                {positionGroup.players.map((player) => (
                                    <div
                                    key={`${team.abbr}-${player.name}`}
                                    className="grid grid-cols-[1fr_auto] gap-3 border border-gray-800 p-2 text-xs sm:text-sm"
                                    >
                                    <p className="font-semibold text-white">{player.name}</p>

                                    <p className="text-right text-gray-400">
                                        {player.club}
                                    </p>
                                    </div>
                                ))}
                                </div>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <p className="text-xs text-gray-500">
                            Roster will be added later.
                        </p>
                    )}

                    {team.manager && (
                        <div className="mt-3 border-t border-gray-700 pt-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                              Manager
                            </p>

                            <div className="grid grid-cols-[1fr_auto] gap-3 border border-gray-800 p-2 text-xs sm:text-sm">
                            <p className="font-semibold text-white">{team.manager.name}</p>

                            <p className="text-right text-gray-400">
                                {team.manager.club}
                            </p>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </article>
          </div>
          );
        })}
      </section>
      <TabBar />
    </main>
  );
}