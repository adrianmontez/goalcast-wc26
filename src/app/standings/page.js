import Image from "next/image";
import TabBar from "@/components/TabBar";

export default function Standings() {
  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 pb-20 sm:pb-14">
      <Image
        src="/images/goalcast_trophy.png"
        alt="GoalCast Trophy"
        width={50}
        height={50}
        className="fixed top-4 right-4 object-contain"
      />
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">GoalCast WC26</h1>

      <section className="mb-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3">
          Group Standings
        </h2>

        <div className="overflow-x-auto">
          <div className="min-w-[620px] border border-white">
            <div className="grid grid-cols-9 border-b border-white p-2 text-xs sm:text-sm font-bold">
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

            <div className="grid grid-cols-9 p-2 text-xs sm:text-sm">
              <span>Coming soon</span>
              <span>0</span>
              <span>0</span>
              <span>0</span>
              <span>0</span>
              <span>0</span>
              <span>0</span>
              <span>0</span>
              <span>0</span>
            </div>
          </div>
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