"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import TabBar from "@/components/TabBar";
import { matches } from "@/data/wc2026Data";
import Link from "next/link";

export default function Schedule() {
  const [openMatches, setOpenMatches] = useState({});
  const [openMatchesLoaded, setOpenMatchesLoaded] = useState(false);
  const [scheduleView, setScheduleView] = useState("datetime");
  
  const [scheduleMatches, setScheduleMatches] = useState(matches);
  const [liveDataStatus, setLiveDataStatus] = useState("loading");
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(null);

  const [votes, setVotes] = useState({});

  const [showCompletedMatches, setShowCompletedMatches] = useState(false);

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
    let cancelled = false;

    Promise.resolve().then(() => {
      const savedOpenMatches = localStorage.getItem(
        "goalcast_open_schedule_matches"
      );

      if (cancelled) return;

      if (savedOpenMatches) {
        try {
          setOpenMatches(JSON.parse(savedOpenMatches));
        } catch {
          setOpenMatches({});
        }
      }

      setOpenMatchesLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!openMatchesLoaded) return;

    localStorage.setItem(
      "goalcast_open_schedule_matches",
      JSON.stringify(openMatches)
    );
  }, [openMatches, openMatchesLoaded]);

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

  function timeToMinutes(time) {
    if (!time || time === "TBD") return 9999;

    const [timePart, period] = time.split(" ");
    const [hourText, minuteText] = timePart.split(":");

    let hours = Number(hourText);
    const minutes = Number(minuteText);

    if (period === "PM" && hours !== 12) {
      hours += 12;
    }

    if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadLiveMatches() {
      try {
        const response = await fetch("/api/live/matches");
        const data = await response.json();

        if (cancelled) return;

        if (data.ok && data.matches) {
          setScheduleMatches(data.matches);
          setLiveDataStatus("live");
          setLiveUpdatedAt(data.updatedAt);
        } else {
          console.error("Live match data failed:", data);
          setLiveDataStatus("static");
        }
      } catch (error) {
        console.error("Could not load live matches:", error);
        setLiveDataStatus("static");
      }
    }

    loadLiveMatches();

    const interval = setInterval(loadLiveMatches, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("goalcast_last_schedule_view", "/schedule");
  }, []);

  function dateAndTimeValue(match) {
    const dateValue = new Date(match.date).getTime();
    const timeValue = timeToMinutes(match.time);

    return dateValue + timeValue * 60 * 1000;
  }

  function groupLabel(group) {
    return String(group).startsWith("Group") ? group : `Group ${group}`;
  }

  function timeToMinutes(time) {
    if (!time || time === "TBD") return 9999;

    const [timePart, period] = time.split(" ");
    const [hourText, minuteText] = timePart.split(":");

    let hours = Number(hourText);
    const minutes = Number(minuteText);

    if (period === "PM" && hours !== 12) {
      hours += 12;
    }

    if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  function dateAndTimeValue(match) {
    const dateValue = new Date(match.date).getTime();
    const safeDateValue = Number.isNaN(dateValue) ? 9999999999999 : dateValue;

    return safeDateValue + timeToMinutes(match.time) * 60 * 1000;
  }

  function getDateOnlyValue(dateText) {
    const date = new Date(dateText);

    if (Number.isNaN(date.getTime())) return null;

    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  function getTodayDateOnlyValue() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  }

  function isTodayMatch(match) {
    const matchDateValue = getDateOnlyValue(match.apiDate || match.date);
    const todayValue = getTodayDateOnlyValue();

    return matchDateValue === todayValue;
  }

  function isCompletedFromPreviousDay(match) {
    if (match.status !== "finished") return false;

    const matchDateValue = getDateOnlyValue(match.apiDate || match.date);
    const todayValue = getTodayDateOnlyValue();

    if (matchDateValue === null) return false;

    return matchDateValue < todayValue;
  }

  const todayMatches = scheduleMatches
    .filter((match) => isTodayMatch(match))
    .sort((a, b) => dateAndTimeValue(a) - dateAndTimeValue(b));

  const completedMatches = scheduleMatches
    .filter((match) => isCompletedFromPreviousDay(match))
    .sort((a, b) => dateAndTimeValue(b) - dateAndTimeValue(a));

  const dateTimeMainMatches = scheduleMatches.filter(
    (match) => !isTodayMatch(match) && !isCompletedFromPreviousDay(match)
  );
  
  const groupedMatches = scheduleMatches.reduce((acc, match) => {
    if (!acc[match.group]) {
      acc[match.group] = [];
    }

    acc[match.group].push(match);
    return acc;
  }, {});

  Object.keys(groupedMatches).forEach((group) => {
    groupedMatches[group].sort((a, b) => dateAndTimeValue(a) - dateAndTimeValue(b));
  });

  const groupKeys = Object.keys(groupedMatches).sort();

  const matchesByDateTime = [...dateTimeMainMatches].sort(
    (a, b) => dateAndTimeValue(a) - dateAndTimeValue(b)
  );

  function renderMatchCard(match) {
    const votingClosed =
      match.status === "live" ||
      match.status === "finished" ||
      match.status === "postponed";
    return (
      <div
        key={match.id}
        className={
          match.status === "live"
            ? "relative border border-red-500 bg-red-500/10 p-3 shadow-[0_0_14px_rgba(239,68,68,0.25)]"
            : "relative border border-gray-700 p-3"
        }
      >
        {match.status === "live" && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span>LIVE</span>
          </div>
        )}

        <div className="mb-2">
          <p className="text-[11px] text-gray-400">{match.date}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/teams?from=schedule#${match.home}`}
            className="flex items-center gap-2 min-w-0 hover:underline"
          >
            <Image
              src={`/flags/${match.home}.png`}
              alt={`${match.home} flag`}
              width={28}
              height={20}
              className="object-cover"
            />
            <span className="font-semibold truncate">{match.home}</span>
          </Link>

          <div className="shrink-0 text-center min-w-[42px]">
            {match.homeScore !== null && match.awayScore !== null ? (
              <>
                <span className="text-sm font-bold text-white">
                  {match.homeScore} - {match.awayScore}
                </span>

                {match.status === "live" && match.elapsed && (
                  <p className="text-[10px] text-red-400">
                    {match.elapsed}&apos;
                  </p>
                )}

                {match.status === "finished" && (
                  <p className="text-[10px] text-gray-400">FT</p>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">vs</span>
            )}
          </div>

          <Link
            href={`/teams?from=schedule#${match.away}`}
            className="flex items-center justify-end gap-2 min-w-0 hover:underline"
          >
            <span className="font-semibold truncate">{match.away}</span>
            <Image
              src={`/flags/${match.away}.png`}
              alt={`${match.away} flag`}
              width={28}
              height={20}
              className="object-cover"
            />
          </Link>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => toggleMatch(match.id)}
            className="text-xs text-gray-300 underline"
          >
            {openMatches[match.id] ? "Hide details" : "Show details"}
          </button>

          <span className="border border-gray-600 px-2 py-0.5 text-[10px] text-gray-300">
            {groupLabel(match.group)}
          </span>
        </div>

        {openMatches[match.id] && (
          <div className="mt-2 border-t border-gray-700 pt-2 text-xs text-gray-300">
            <p>Time: {match.time}</p>
            <p>Stadium: {match.stadium}</p>

            <div className="mt-3 border-t border-gray-700 pt-3">
              <p className="mb-2 text-xs font-semibold text-white">
                Who will win?
              </p>

              {votingClosed && (
                <p className="mb-2 text-[11px] text-gray-400">
                  Voting closed once match starts.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleVote(match.id, match.home)}
                  disabled={votingMatch === match.id || votingClosed}
                  className={
                    myVotes[match.id] === match.home
                      ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                  disabled={votingMatch === match.id || votingClosed}
                  className={
                    myVotes[match.id] === "DRAW"
                      ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  }
                >
                  <span>Draw</span>
                  <span className="text-gray-300">
                    ({getVoteCount(match.id, "DRAW")})
                  </span>
                </button>

                <button
                  onClick={() => handleVote(match.id, match.away)}
                  disabled={votingMatch === match.id || votingClosed}
                  className={
                    myVotes[match.id] === match.away
                      ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
    );
  }

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

      <p className="mb-2 text-xs text-gray-400">
        {liveDataStatus === "live"
          ? `Live data connected${liveUpdatedAt ? ` • Updated ${new Date(liveUpdatedAt).toLocaleTimeString()}` : ""}`
          : liveDataStatus === "loading"
            ? "Loading live data..."
            : "Using saved schedule data"}
      </p>

      <div className="mb-6 flex w-full sm:w-fit border border-white text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => setScheduleView("datetime")}
          className={
            scheduleView === "datetime"
              ? "flex-1 sm:flex-none bg-white px-3 py-2 font-semibold text-black"
              : "flex-1 sm:flex-none bg-black px-3 py-2 font-semibold text-white hover:bg-gray-800"
          }
        >
          View by Date/Time
        </button>

        <button
          type="button"
          onClick={() => setScheduleView("group")}
          className={
            scheduleView === "group"
              ? "flex-1 sm:flex-none bg-white px-3 py-2 font-semibold text-black"
              : "flex-1 sm:flex-none bg-black px-3 py-2 font-semibold text-white hover:bg-gray-800"
          }
        >
          View by Group
        </button>
      </div>
      
      {todayMatches.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 border-b border-white pb-2">
            <h2 className="text-lg sm:text-xl font-semibold">
              Today&apos;s Matches
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
            {todayMatches.map((match) => renderMatchCard(match))}
          </div>
        </section>
      )}

      {completedMatches.length > 0 && (
        <section className="mb-8">
          <button
            type="button"
            onClick={() => setShowCompletedMatches((current) => !current)}
            className="mb-3 flex w-full items-center justify-between border-b border-white pb-2 text-left"
          >
            <h2 className="text-lg sm:text-xl font-semibold">
              Completed Matches
            </h2>

            <span className="text-xs text-gray-300">
              {showCompletedMatches ? "Hide" : "Show"} ({completedMatches.length})
            </span>
          </button>

          {showCompletedMatches && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
              {completedMatches.map((match) => renderMatchCard(match))}
            </div>
          )}
        </section>
      )}

      {scheduleView === "group" ? (
  <     div className="space-y-8">
          {groupKeys.map((group) => (
            <section key={group} className="space-y-3">
              <div className="pb-2 border-b border-white">
                <h2 className="text-lg sm:text-xl font-semibold">
                  {groupLabel(group)}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                {groupedMatches[group].map((match) => renderMatchCard(match))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="space-y-3">
          <div className="pb-2 border-b border-white">
            <h2 className="text-lg sm:text-xl font-semibold">
              All Matches by Date/Time
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
            {matchesByDateTime.map((match) => renderMatchCard(match))}
          </div>
        </section>
      )}

      <TabBar />
    </main>
  );
}