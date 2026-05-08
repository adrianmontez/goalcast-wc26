"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import TabBar from "@/components/TabBar";
import { matches } from "@/data/wc2026Data";

export default function Schedule() {
  const [openMatches, setOpenMatches] = useState({});
  
  const [votes, setVotes] = useState({});

  const [myVotes, setMyVotes] = useState(() => {
    if (typeof window === "undefined") return {};

    const savedVotes = localStorage.getItem("goalcast_my_votes");
    return savedVotes ? JSON.parse(savedVotes) : {};
  });

  const [voterId] = useState(() => {
    if (typeof window === "undefined") return "";

    const existing = localStorage.getItem("goalcast_voter_id");

    if (existing) {
      return existing;
    }

    const newId = crypto.randomUUID();
    localStorage.setItem("goalcast_voter_id", newId);
    return newId;
  });

  const [votingMatch, setVotingMatch] = useState(null);

  async function fetchVotes() {
    const response = await fetch("/api/match-votes");
    const data = await response.json();

    return data.counts || {};
  }

  function getVoteCount(matchId, teamAbbr) {
    return votes?.[matchId]?.[teamAbbr] || 0;
  }

  async function handleVote(matchId, teamAbbr) {
    if (!voterId) return;

    setVotingMatch(matchId);

    await fetch("/api/match-votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        matchId,
        pick: teamAbbr,
        voterId,
      }),
    });

    setMyVotes((current) => ({
      ...current,
      [matchId]: teamAbbr,
    }));

    const updatedCounts = await fetchVotes();
    setVotes(updatedCounts);

    setVotingMatch(null);
  }

  function toggleMatch(matchId) {
    setOpenMatches((currentOpenMatches) => ({
      ...currentOpenMatches,
      [matchId]: !currentOpenMatches[matchId],
    }));
  }

  useEffect(() => {
    let ignore = false;

    fetchVotes().then((counts) => {
      if (!ignore) {
        setVotes(counts);
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("goalcast_my_votes", JSON.stringify(myVotes));
  }, [myVotes]);

  const groupedMatches = matches.reduce((acc, match) => {
    if (!acc[match.group]) acc[match.group] = [];
    acc[match.group].push(match);
    return acc;
  }, {});

  const groupKeys = Object.keys(groupedMatches).sort();

  return (
    <main className="relative min-h-screen bg-black text-white p-4 sm:p-6 pb-12">
      <Image
        src="/images/goalcast_soccerball.png"
        alt="GoalCast Soccer Ball"
        width={40}
        height={40}
        className="absolute top-4 right-4 object-contain"
      />

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
                      <div className="mt-3 border-t border-gray-700 pt-3">
                        <p className="mb-2 text-xs font-semibold text-white">Who will win?</p>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleVote(match.id, match.home)}
                            disabled={votingMatch === match.id}
                            className={
                              myVotes[match.id] === match.home
                                ? "border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white"
                                : "border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                            }
                          >
                            {match.home}{" "}
                            <span className="text-gray-300">
                              ({getVoteCount(match.id, match.home)})
                            </span>
                          </button>

                          <button
                            onClick={() => handleVote(match.id, match.away)}
                            disabled={votingMatch === match.id}
                            className={
                              myVotes[match.id] === match.away
                                ? "border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white"
                                : "border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                            }
                          >
                            {match.away}{" "}
                            <span className="text-gray-300">
                              ({getVoteCount(match.id, match.away)})
                            </span>
                          </button>
                        </div>
                      </div>
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