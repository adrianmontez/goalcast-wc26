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

    const alreadyVotedForThisTeam = myVotes[matchId] === teamAbbr;

    if (alreadyVotedForThisTeam) {
      const deleteResponse = await fetch("/api/match-votes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          voterId,
        }),
      });

      const deleteData = await deleteResponse.json();

      if (!deleteResponse.ok) {
        console.error("Remove vote failed:", deleteData);
        setVotingMatch(null);
        return;
      }

      setMyVotes((current) => {
        const updated = { ...current };
        delete updated[matchId];
        return updated;
      });

      const updatedCounts = await fetchVotes();
      setVotes(updatedCounts);

      setVotingMatch(null);
      return;
    }

    const voteResponse = await fetch("/api/match-votes", {
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

    const voteData = await voteResponse.json();

    if (!voteResponse.ok) {
      console.error("Vote failed:", voteData);
      setVotingMatch(null);
      return;
    }

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
    localStorage.setItem(
      "goalcast_open_schedule_matches",
      JSON.stringify(openMatches)
    );
  }, [openMatches]);

  useEffect(() => {
    let ignore = false;

    Promise.resolve().then(() => {
      const savedOpenMatches = localStorage.getItem(
        "goalcast_open_schedule_matches"
      );

      if (!ignore && savedOpenMatches) {
        setOpenMatches(JSON.parse(savedOpenMatches));
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

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
                                ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white"
                                : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                            }
                          >
                            <Image
                              src={`/flags/${match.home}.png`}
                              alt={`${match.home} flag`}
                              width={18}
                              height={12}
                              className="object-cover"
                            />

                            <span>{match.home}</span>

                            <span className="text-gray-300">
                              ({getVoteCount(match.id, match.home)})
                            </span>
                          </button>

                          <button
                            onClick={() => handleVote(match.id, "DRAW")}
                            disabled={votingMatch === match.id}
                            className={
                              myVotes[match.id] === "DRAW"
                                ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white"
                                : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                            }
                          >
                            <span>Draw</span>

                            <span className="text-gray-300">
                              ({getVoteCount(match.id, "DRAW")})
                            </span>
                          </button>

                          <button
                            onClick={() => handleVote(match.id, match.away)}
                            disabled={votingMatch === match.id}
                            className={
                              myVotes[match.id] === match.away
                                ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white"
                                : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                            }
                          >
                            <Image
                              src={`/flags/${match.away}.png`}
                              alt={`${match.away} flag`}
                              width={18}
                              height={12}
                              className="object-cover"
                            />

                            <span>{match.away}</span>

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