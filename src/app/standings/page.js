import Image from "next/image";
import TabBar from "@/components/TabBar";
import { groups } from "@/data/wc2026Data";

function buildInitialStandings(groups) {
  return groups.map((groupData) => ({
    group: groupData.group,
    teams: groupData.teams.map((team) => ({
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
    })),
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
          Standings will be updated closer to the start of the tournament.
        </p>

        <div className="space-y-6">
          {standings.map((groupData) => (
            <div key={groupData.group}>
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                Group {groupData.group}
              </h3>

              <div className="overflow-x-auto">
                <div className="min-w-[720px] border border-white">
                  <div className="grid grid-cols-[2.5rem_1fr_repeat(8,3rem)] border-b border-white p-2 text-xs sm:text-sm font-bold">
                    <span></span>
                    <span>Team</span>
                    <span>MP</span>
                    <span>W</span>
                    <span>D</span>
                    <span>L</span>
                    <span>GF</span>
                    <span>GA</span>
                    <span>GD</span>
                    <span>Pts</span>
                  </div>

                  {groupData.teams.map((team) => (
                    <div
                      key={team.abbr}
                      className="grid grid-cols-[2.5rem_1fr_repeat(8,3rem)] border-b border-gray-700 last:border-b-0 p-2 text-xs sm:text-sm items-center"
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

                      <div className="font-semibold">
                        <span className="hidden sm:inline">{team.name}</span>
                        <span className="sm:hidden">{team.abbr}</span>
                      </div>

                      <span>{team.mp}</span>
                      <span>{team.w}</span>
                      <span>{team.d}</span>
                      <span>{team.l}</span>
                      <span>{team.gf}</span>
                      <span>{team.ga}</span>
                      <span>{team.gd}</span>
                      <span className="font-bold">{team.pts}</span>
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