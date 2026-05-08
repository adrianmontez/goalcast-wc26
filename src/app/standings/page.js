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

export default function Standings() {
  const standings = buildInitialStandings(groups);

  return (
    <main className="relative min-h-screen bg-black text-white p-4 sm:p-6 pb-20 sm:pb-14">
      <Image
        src="/images/goalcast_trophy.png"
        alt="GoalCast Trophy"
        width={50}
        height={50}
        className="absolute top-4 right-4 object-contain"
      />

      <h1 className="text-2xl sm:text-3xl font-bold mb-6">GoalCast WC26</h1>

      <section className="mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3">
          Group Standings
        </h2>

        <p className="text-xs sm:text-sm text-gray-400 mb-4">
          The top 2 teams from each group advance, along with the 8 best 3rd place teams.
        </p>

        <div className="space-y-6">
          {standings.map((groupData) => (
            <div key={groupData.group}>
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                Group {groupData.group}
              </h3>

              <div className="overflow-x-auto">
                <div className="min-w-[560px] sm:min-w-[760px] w-full border border-white">
                  <div className="grid grid-cols-[2rem_5rem_repeat(8,minmax(2.25rem,1fr))] sm:grid-cols-[2rem_13rem_repeat(8,minmax(2.75rem,1fr))] border-b border-white p-2 text-xs sm:text-sm font-bold">
                    <span></span>
                    <span>Team</span>
                    <span className="text-center">MP</span>
                    <span className="text-center">W</span>
                    <span className="text-center">D</span>
                    <span className="text-center">L</span>
                    <span className="text-center">GF</span>
                    <span className="text-center">GA</span>
                    <span className="text-center">GD</span>
                    <span className="text-center">Pts</span>
                  </div>

                  {groupData.teams.map((team) => (
                    <div
                      key={team.abbr}
                      className="grid grid-cols-[2rem_5rem_repeat(8,minmax(2.25rem,1fr))] sm:grid-cols-[2rem_13rem_repeat(8,minmax(2.75rem,1fr))] border-b border-gray-700 last:border-b-0 p-2 text-xs sm:text-sm items-center"
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
                      <span className="text-center">{team.gf}</span>
                      <span className="text-center">{team.ga}</span>
                      <span className="text-center">{team.gd}</span>
                      <span className="text-center font-bold">{team.pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
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