"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { groups } from "@/data/wc2026Data";
import { teamMeritsByName } from "@/data/teamMerits";
import TabBar from "@/components/TabBar";
import { useEffect } from "react";

function getAllTeams() {
  return groups
    .flatMap((group) =>
      group.teams.map((team) => ({
        ...team,
        group: group.group,
        merits: teamMeritsByName[team.name] || null,
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

export default function TeamsPage() {
  const router = useRouter();
  const teams = getAllTeams();
  
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
          className="scroll-mt-6 border border-gray-700 p-3 sm:p-4"
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

                <div className="hidden sm:flex flex-1 items-center justify-center gap-3">
                    {renderWorldCupStars(merits?.worldCupWins)}
                    {renderConfederationBadge(merits)}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[10px] uppercase text-gray-500">
                    FIFA Rank
                  </p>

                  <p className="text-lg sm:text-xl font-bold">
                    {merits?.fifaRank ?? "N/A"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
                {renderWorldCupStars(merits?.worldCupWins)}
                {renderConfederationBadge(merits)}
              </div>
            </article>
          </div>
          );
        })}
      </section>
      <TabBar />
    </main>
  );
}