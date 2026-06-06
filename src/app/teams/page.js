import Image from "next/image";
import Link from "next/link";
import { groups } from "@/data/wc2026Data";
import { teamMeritsByName } from "@/data/teamMerits";

function getAllTeams() {
  return groups.flatMap((group) =>
    group.teams.map((team) => ({
      ...team,
      group: group.group,
      merits: teamMeritsByName[team.name] || null,
    }))
  );
}

function renderWorldCupStars(count) {
  const wins = Number(count || 0);

  if (wins <= 0) {
    return (
      <span className="text-xs text-gray-500">
        No World Cup wins
      </span>
    );
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

export default function TeamsPage() {
  const teams = getAllTeams();

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 pb-20">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Teams
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-gray-400">
            View each team&apos;s FIFA ranking, World Cup wins, and tournament merits.
          </p>
        </div>

        <Link
          href="/standings"
          className="shrink-0 border border-white px-3 py-2 text-xs sm:text-sm font-semibold hover:bg-gray-800"
        >
          Back
        </Link>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">
          Jump to team
        </h2>

        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <a
              key={team.abbr}
              href={`#${team.abbr}`}
              className="border border-gray-700 px-2 py-1 text-xs font-semibold hover:bg-gray-800"
            >
              {team.abbr}
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {teams.map((team) => {
          const merits = team.merits;

          return (
            <article
              key={team.abbr}
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
                    {merits?.confederation ? ` • ${merits.confederation}` : ""}
                  </p>
                </div>

                <div className="hidden sm:flex flex-1 justify-center">
                  {renderWorldCupStars(merits?.worldCupWins)}
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

              <div className="mt-3 flex sm:hidden">
                {renderWorldCupStars(merits?.worldCupWins)}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}