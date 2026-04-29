import TabBar from "@/components/TabBar";

export default function Standings() {
  return (
    <main className="min-h-screen bg-black text-white p-6 pb-12">
      <h1 className="text-3xl font-bold mb-6">GoalCast WC26</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Group Standings</h2>

        <div className="border border-white">
          <div className="grid grid-cols-9 border-b border-white p-2 font-bold">
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

          <div className="grid grid-cols-9 p-2">
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
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Knockout Bracket</h2>
        <div className="border border-white p-4">
          Bracket will appear here after group play.
        </div>
      </section>

      <TabBar />
    </main>
  );
}