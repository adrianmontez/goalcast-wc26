"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import TabBar from "@/components/TabBar";
import { groups, matches } from "@/data/wc2026Data";
import { knockoutSeeding } from "@/data/knockoutSeeding";
import { thirdPlaceMapping } from "@/data/thirdPlaceMapping";
import Link from "next/link";


export default function Schedule() {
  const [openMatches, setOpenMatches] = useState({});
  const [openMatchesLoaded, setOpenMatchesLoaded] = useState(false);
  const [scheduleView, setScheduleView] = useState(() => {
    if (typeof window === "undefined") return "datetime";

    return window.localStorage.getItem("goalcast_schedule_view") || "datetime";
  });
  
  const [scheduleMatches, setScheduleMatches] = useState(matches);
  const [liveStandings, setLiveStandings] = useState([]);
  const [liveDataStatus, setLiveDataStatus] = useState("loading");
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(null);

  const [votes, setVotes] = useState({});

  const [showCompletedMatches, setShowCompletedMatches] = useState(() => {
    if (typeof window === "undefined") return false;

    return window.localStorage.getItem("goalcast_show_completed_matches") === "true";
  });
  
  const fetchedFinishedDetailsRef = useRef(new Set());

  const [matchDetailsByFixture, setMatchDetailsByFixture] = useState({});
  const [loadingDetailsByFixture, setLoadingDetailsByFixture] = useState({});

  const [openScheduleGroups, setOpenScheduleGroups] = useState({});

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

  function getVoteMatchId(match) {
    if (match.stage === "knockout") {
      const assignedMatchNumber =
        knockoutMatchNumberById.get(match.id) || match.matchNumber;

      if (assignedMatchNumber) {
        const numericMatchId = Number(
          String(assignedMatchNumber).replace("M", "")
        );

        if (Number.isFinite(numericMatchId) && numericMatchId > 0) {
          return numericMatchId;
        }
      }
    }

    return match.id;
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

  function toggleCompletedMatches() {
    setShowCompletedMatches((current) => {
      const nextValue = !current;

      try {
        window.localStorage.setItem(
          "goalcast_show_completed_matches",
          String(nextValue)
        );
      } catch (error) {
        console.error("Could not save completed matches preference:", error);
      }

      return nextValue;
    });
  }

  function getMatchStatusLabel(match) {
    const status = match.apiStatusShort;

    if (status === "HT") return "HT";
    if (status === "FT") return "FT";
    if (status === "AET") return "AET";
    if (status === "PEN") return "PEN";
    if (status === "PST") return "Postponed";
    if (status === "CANC") return "Cancelled";
    if (status === "ABD") return "Abandoned";
    if (status === "SUSP") return "Suspended";
    if (status === "INT") return "Interrupted";

    if (match.status === "live" && match.elapsed) {
      if (match.extra) {
        return `${match.elapsed}+${match.extra}'`;
      }

      return `${match.elapsed}'`;
    }

    return "";
  }

  function shouldShowPenaltySection(match) {
    const penaltyScore = getPenaltyScore(match);

    return (
      match.apiStatusShort === "P" ||
      match.apiStatusShort === "PEN" ||
      Boolean(penaltyScore)
    );
  }

  function changeScheduleView(view) {
    setScheduleView(view);

    try {
      window.localStorage.setItem("goalcast_schedule_view", view);
    } catch (error) {
      console.error("Could not save schedule view:", error);
    }
  }

  function toggleScheduleGroup(group) {
    setOpenScheduleGroups((current) => ({
      ...current,
      [group]: current[group] === false ? true : false,
    }));
  }

  function getTeamsForGroup(groupLetter) {
    const groupData = groups.find((group) => group.group === groupLetter);

    return groupData?.teams || [];
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

  useEffect(() => {
    let cancelled = false;

    async function loadScorerDetailsForMatches(nextMatches) {
      const matchesThatNeedDetails = nextMatches.filter((match) => {
        if (!match.apiFixtureId) return false;

        const isLiveMatch = match.status === "live";
        const matchDate = new Date(match.apiDate || match.date);
        const today = new Date();

        const isFinishedToday =
          match.status === "finished" &&
          !Number.isNaN(matchDate.getTime()) &&
          matchDate.getFullYear() === today.getFullYear() &&
          matchDate.getMonth() === today.getMonth() &&
          matchDate.getDate() === today.getDate();

        if (isLiveMatch) return true;

        if (isFinishedToday) {
          return !fetchedFinishedDetailsRef.current.has(match.apiFixtureId);
        }

        return false;
      });

      await Promise.all(
        matchesThatNeedDetails.map(async (match) => {
          try {
            const response = await fetch(
              `/api/live/match-details?fixture=${match.apiFixtureId}`,
              {
                cache: "no-store",
              }
            );

            const data = await response.json();

            if (!data.ok) return;

            setMatchDetailsByFixture((current) => ({
              ...current,
              [match.apiFixtureId]: {
                fixture: data.fixture,
                events: data.events || [],
                updatedAt: data.updatedAt,
              },
            }));

            if (match.status === "finished") {
              fetchedFinishedDetailsRef.current.add(match.apiFixtureId);
            }
          } catch (error) {
            console.error("Could not load scorer details:", error);
          }
        })
      );
    }

    async function loadLiveMatches() {
      try {
        const endpointCandidates = ["/api/live/matches"];

        if (typeof window !== "undefined") {
          endpointCandidates.push(`${window.location.origin}/api/live/matches`);
        }

        let data = null;

        for (const endpoint of endpointCandidates) {
          try {
            const response = await fetch(endpoint, {
              cache: "no-store",
            });

            data = await response.json();

            if (data?.matches) {
              break;
            }
          } catch {
            // Try the next endpoint candidate.
          }
        }

        if (cancelled) return;

        if (data?.ok && data.matches) {
          setScheduleMatches(data.matches);
          setLiveDataStatus("connected");
          setLiveUpdatedAt(data.updatedAt);

          loadScorerDetailsForMatches(data.matches);
        } else {
          setScheduleMatches(matches);
          setLiveDataStatus("static");
        }
      } catch (error) {
        console.warn("Could not load live matches.");
        setScheduleMatches(matches);
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

  useEffect(() => {
    let cancelled = false;

    async function loadLiveStandings() {
      try {
        const response = await fetch("/api/live/standings", {
          cache: "no-store",
        });
        const data = await response.json();

        if (cancelled) return;

        if (Array.isArray(data?.standings)) {
          setLiveStandings(data.standings);
        }
      } catch (error) {
        console.error("Could not load standings for knockout seeding:", error);
      }
    }

    loadLiveStandings();

    const interval = setInterval(loadLiveStandings, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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

  function shouldLoadMatchDetails(match) {
    return (
      Boolean(match.apiFixtureId) &&
      (match.status === "live" || match.status === "finished")
    );
  }

  function getMatchDetails(match) {
    if (!match.apiFixtureId) return null;
    return matchDetailsByFixture[match.apiFixtureId] || null;
  }

  function getGoalEvents(match) {
    const details = getMatchDetails(match);
    const events = details?.events || [];

    return events.filter((event) => {
      const type = String(event.type || "").toLowerCase();
      const detail = String(event.detail || "").toLowerCase();
      const comments = String(event.comments || "").toLowerCase();
      const elapsed = Number(event.time?.elapsed);
      const extra = Number(event.time?.extra);

      const totalMinute = Number.isFinite(elapsed)
        ? elapsed + (Number.isFinite(extra) ? extra : 0)
        : null;

      const isAfterExtraTime = Number.isFinite(totalMinute) && totalMinute > 120;

      if (isAfterExtraTime) return false;

      const isPenaltyShootoutEvent =
        type.includes("shootout") ||
        detail.includes("shootout") ||
        comments.includes("shootout") ||
        comments.includes("penalty shootout");

      if (isPenaltyShootoutEvent) return false;

      const isMissedPenalty =
        detail.includes("missed penalty") ||
        detail.includes("penalty missed") ||
        detail.includes("penalty saved") ||
        detail.includes("saved penalty");

      if (isMissedPenalty) return false;

      const isNormalGoal = detail === "normal goal";
      const isOwnGoal = detail === "own goal";
      const isScoredPenalty =
        detail === "penalty" ||
        detail.includes("scored penalty") ||
        detail.includes("penalty goal");

      return type === "goal" && (isNormalGoal || isOwnGoal || isScoredPenalty);
    });
  }

  function formatGoalMinute(event) {
    const elapsed = event.time?.elapsed;
    const extra = event.time?.extra;

    if (!elapsed) return "";

    return extra ? `${elapsed}+${extra}'` : `${elapsed}'`;
  }

  function getTeamAbbrByApiName(apiName) {
    const normalizedApiName = String(apiName || "").trim().toLowerCase();

    const apiNameMap = {
      "czech republic": "CZE",
      "czechia": "CZE",

      "south korea": "KOR",
      "korea republic": "KOR",
      "republic of korea": "KOR",

      "usa": "USA",
      "united states": "USA",
      "united states of america": "USA",

      "bosnia": "BIH",
      "bosnia and herzegovina": "BIH",
      "bosnia & herzegovina": "BIH",
      "bosnia-herzegovina": "BIH",

      "turkiye": "TUR",
      "turkey": "TUR",
      "türkiye": "TUR",

      "cote d'ivoire": "CIV",
      "côte d'ivoire": "CIV",
      "ivory coast": "CIV",

      "cape verde": "CPV",
      "cape verde islands": "CPV",
      "cabo verde": "CPV",
      "cabo verde islands": "CPV",

      "dr congo": "COD",
      "d.r. congo": "COD",
      "democratic republic of congo": "COD",
      "congo dr": "COD",
      "congo democratic republic": "COD",

      "curacao": "CUW",
      "curaçao": "CUW",
      "curaçao national team": "CUW",
      "curacao national team": "CUW",
    };

    if (apiNameMap[normalizedApiName]) {
      return apiNameMap[normalizedApiName];
    }

    const allTeams = groups.flatMap((group) => group.teams);

    const team = allTeams.find(
      (item) => item.name.toLowerCase() === normalizedApiName
    );

    return team?.abbr || apiName;
  }

  function formatGoalDetail(event) {
    const detail = String(event.detail || "");

    if (detail.toLowerCase() === "normal goal") {
      return "";
    }

    if (detail.toLowerCase() === "own goal") {
      return "Own goal";
    }

    if (detail.toLowerCase() === "penalty") {
      return "Penalty";
    }

    return detail;
  }

  function getGoalEventFlagAbbr(event, match) {
    const detail = String(event.detail || "").toLowerCase();
    const eventTeamAbbr = getTeamAbbrByApiName(event.team?.name);

    if (detail === "own goal") {
      if (eventTeamAbbr === match.home) return match.away;
      if (eventTeamAbbr === match.away) return match.home;
    }

    return eventTeamAbbr;
  }

  function getPenaltyScore(match) {
    const details = getMatchDetails(match);
    const penaltyScore = details?.fixture?.score?.penalty;

    const homePenalty =
      penaltyScore?.home ??
      match.penaltyHomeScore ??
      match.penalty?.home ??
      null;
    const awayPenalty =
      penaltyScore?.away ??
      match.penaltyAwayScore ??
      match.penalty?.away ??
      null;

    if (homePenalty === null || homePenalty === undefined) return null;
    if (awayPenalty === null || awayPenalty === undefined) return null;

    return {
      home: homePenalty,
      away: awayPenalty,
    };
  }

  function getPenaltyEvents(match) {
    const details = getMatchDetails(match);
    const events = details?.events || [];

    return events.filter((event) => {
      const type = String(event.type || "").toLowerCase();
      const detail = String(event.detail || "").toLowerCase();
      const comments = String(event.comments || "").toLowerCase();

      return (
        type.includes("penalty") ||
        detail.includes("penalty") ||
        detail.includes("shootout") ||
        comments.includes("penalty") ||
        comments.includes("shootout")
      );
    });
  }

  function getPenaltyMainCardText(match, penaltyScore) {
    if (!penaltyScore) return "";

    if (String(match.apiStatusShort || "").toUpperCase() === "PEN") {
      return `PEN ${penaltyScore.home}-${penaltyScore.away}`;
    }

    return `Pens ${penaltyScore.home} - ${penaltyScore.away}`;
  }

  function formatPenaltyEventDetail(event) {
    const detail = String(event.detail || "").toLowerCase();
    const type = String(event.type || "").toLowerCase();

    if (
      detail.includes("missed") ||
      detail.includes("saved") ||
      detail.includes("save")
    ) {
      return "Missed";
    }

    if (
      detail === "penalty" ||
      detail.includes("scored") ||
      detail.includes("shootout") ||
      type.includes("penalty")
    ) {
      return "Made";
    }

    return event.detail || event.type || "";
  }

  const loadMatchDetails = useCallback(async (match) => {
    if (!shouldLoadMatchDetails(match)) return;

    const fixtureId = match.apiFixtureId;

    if (!fixtureId) return;
    if (loadingDetailsByFixture[fixtureId]) return;

    setLoadingDetailsByFixture((current) => ({
      ...current,
      [fixtureId]: true,
    }));

    try {
      const isFinished =
        match.apiStatusShort === "FT" ||
        match.apiStatusShort === "AET" ||
        match.apiStatusShort === "PEN";

      if (isFinished) {
        const savedResponse = await fetch(
          `/api/archive/finished-match?fixture=${fixtureId}`,
          { cache: "no-store" }
        );

        const savedData = await savedResponse.json();

        if (savedData.ok && savedData.snapshot) {
          setMatchDetailsByFixture((current) => ({
            ...current,
            [fixtureId]: {
              fixture: savedData.snapshot.fixture_json,
              events: savedData.snapshot.events_json || [],
              updatedAt: savedData.snapshot.updated_at,
              source: "archive",
            },
          }));

          return;
        }
      }

      const response = await fetch(`/api/live/match-details?fixture=${fixtureId}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (data.ok) {
        setMatchDetailsByFixture((current) => ({
          ...current,
          [fixtureId]: {
            fixture: data.fixture,
            events: data.events || [],
            updatedAt: data.updatedAt,
            source: "api",
          },
        }));

        if (isFinished) {
          await fetch("/api/archive/save-finished-match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchId: match.id,
              apiFixtureId: match.apiFixtureId,
              home: match.home,
              away: match.away,
              homeScore: match.homeScore,
              awayScore: match.awayScore,
              apiStatusShort: match.apiStatusShort,
              apiStatusLong: match.apiStatusLong,
              fixture: data.fixture,
              events: data.events || [],
            }),
          });
        }
      }
    } catch (error) {
      console.error("Could not load match details:", error);
    } finally {
      setLoadingDetailsByFixture((current) => ({
        ...current,
        [fixtureId]: false,
      }));
    }
  }, [loadingDetailsByFixture]);

  useEffect(() => {
    if (!openMatchesLoaded) return;

    const openMatchesThatNeedDetails = scheduleMatches.filter((match) => {
      if (!openMatches[match.id]) return false;
      if (!shouldLoadMatchDetails(match)) return false;
      if (!match.apiFixtureId) return false;
      if (matchDetailsByFixture[match.apiFixtureId]) return false;
      if (loadingDetailsByFixture[match.apiFixtureId]) return false;

      return true;
    });

    openMatchesThatNeedDetails.forEach((match) => {
      loadMatchDetails(match);
    });
  }, [
    openMatchesLoaded,
    openMatches,
    scheduleMatches,
    matchDetailsByFixture,
    loadingDetailsByFixture,
    loadMatchDetails,
  ]);

  function getMatchDateObject(match) {
    const rawDate = match.apiDate || match.date;

    if (!rawDate) return null;

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) return null;

    return date;
  }

  function formatMatchDate(match) {
    const date = getMatchDateObject(match);

    if (!date) return match.date || "TBD";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatMatchTime(match) {
    const date = getMatchDateObject(match);

    if (!date) return match.time || "TBD";

    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
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

  function isGroupStageMatch(match) {
    return match.stage !== "knockout" && Boolean(match.group);
  }

  function isKnockoutMatch(match) {
    return match.stage === "knockout";
  }

  function getMatchCompetitionLabel(match) {
    if (match.stage === "knockout") {
      return match.round || "Knockout Round";
    }

    return match.group ? `Group ${match.group}` : "";
  }

  function groupKnockoutMatchesByRound(matchesToGroup) {
    const roundOrder = [
      "Round of 32",
      "Round of 16",
      "Quarterfinals",
      "Semifinals",
      "Third Place",
      "Final",
    ];

    const grouped = matchesToGroup.reduce((current, match) => {
      const round = match.round || "Knockout Round";
      const assignedMatchNumber =
        knockoutMatchNumberById.get(match.id) || match.matchNumber;

      const normalizedMatchNumber = assignedMatchNumber
        ? String(assignedMatchNumber).startsWith("M")
          ? String(assignedMatchNumber)
          : `M${assignedMatchNumber}`
        : null;

      if (!current[round]) current[round] = [];

      if (normalizedMatchNumber) {
        const existingIndex = current[round].findIndex((item) => {
          const itemMatchNumber = knockoutMatchNumberById.get(item.id) || item.matchNumber;
          const normalizedItemMatchNumber = itemMatchNumber
            ? String(itemMatchNumber).startsWith("M")
              ? String(itemMatchNumber)
              : `M${itemMatchNumber}`
            : null;

          return normalizedItemMatchNumber === normalizedMatchNumber;
        });

        if (existingIndex >= 0) {
          current[round][existingIndex] = match;
          return current;
        }
      }

      current[round].push(match);

      return current;
    }, {});

    knockoutSeeding.forEach((seedMatch) => {
      const round = seedMatch.roundType;

      if (!grouped[round]) {
        grouped[round] = [];
      }

      const exists = grouped[round].some((match) => {
        const assignedMatchNumber =
          knockoutMatchNumberById.get(match.id) || match.matchNumber;

        const normalizedMatchNumber = assignedMatchNumber
          ? String(assignedMatchNumber).startsWith("M")
            ? String(assignedMatchNumber)
            : `M${assignedMatchNumber}`
          : null;

        return normalizedMatchNumber === seedMatch.matchNumber;
      });

      if (exists) return;

      grouped[round].push({
        id: `placeholder-${seedMatch.matchNumber}`,
        stage: "knockout",
        round,
        matchNumber: seedMatch.matchNumber,
        home: "TBD",
        away: "TBD",
        homeScore: null,
        awayScore: null,
        status: "scheduled",
        apiStatusShort: "",
        date: "TBD",
        time: "TBD",
        venue: seedMatch.venue || "",
        city: seedMatch.city || "",
      });
    });

    return roundOrder
      .filter((round) => grouped[round])
      .map((round) => ({
        round,
        matches: grouped[round].sort(
          (a, b) => dateAndTimeValue(a) - dateAndTimeValue(b)
        ),
      }));
  }

  function hasTeamFlag(teamAbbr) {
    return Boolean(teamAbbr) && teamAbbr !== "TBD" && !String(teamAbbr).includes(" ");
  }

  function getTeamRankInStandings(teamAbbr) {
    for (const groupData of liveStandings) {
      const index = groupData.teams.findIndex((team) => team.abbr === teamAbbr);

      if (index >= 0) {
        const explicitRank = Number(groupData.teams[index]?.rank);

        return {
          group: String(groupData.group),
          rank: Number.isFinite(explicitRank) && explicitRank > 0 ? explicitRank : index + 1,
        };
      }
    }

    return null;
  }

  function getSeedForTeam(teamAbbr) {
    const rankData = getTeamRankInStandings(teamAbbr);

    if (!rankData) return null;
    return `${rankData.rank}${rankData.group}`;
  }

  function getBestThirdPlaceGroupKey() {
    const thirdPlaceTeams = liveStandings
      .map((groupData) => {
        const third = groupData.teams?.[2];
        if (!third) return null;

        return {
          group: String(groupData.group),
          pts: Number(third.pts ?? third.points ?? 0),
          gd: Number(third.gd ?? third.goalsDiff ?? third.goalDifference ?? third.goals?.diff ?? 0),
          gf: Number(third.gf ?? third.goalsFor ?? third.goals?.for ?? 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.group.localeCompare(b.group);
      })
      .slice(0, 8)
      .map((item) => item.group)
      .sort()
      .join("");

    return thirdPlaceTeams;
  }

  function resolveRoundOf32Seed(seedValue, seedMatch, thirdPlaceSlots) {
    if (/^3[A-L]{2,}$/.test(seedValue)) {
      return thirdPlaceSlots[seedMatch.matchNumber] || seedValue;
    }

    return seedValue;
  }

  function getFinishedWinner(match) {
    const status = String(match.apiStatusShort || "").toUpperCase();
    const isFinished = status === "FT" || status === "AET" || status === "PEN";

    if (!isFinished) return null;
    if (match.homeWinner === true) return match.home;
    if (match.awayWinner === true) return match.away;

    const homeScore = Number(match.homeScore);
    const awayScore = Number(match.awayScore);

    if (homeScore > awayScore) return match.home;
    if (awayScore > homeScore) return match.away;

    return null;
  }

  function getFinishedLoser(match) {
    const winner = getFinishedWinner(match);
    if (!winner) return null;
    if (winner === match.home) return match.away;
    if (winner === match.away) return match.home;
    return null;
  }

  function getPossibleSideTokens(teamAbbr, winnerTokenByTeam, loserTokenByTeam) {
    const tokens = [];

    if (teamAbbr && teamAbbr !== "TBD") {
      tokens.push(teamAbbr);
    }

    const seed = getSeedForTeam(teamAbbr);
    if (seed) tokens.push(seed);

    if (winnerTokenByTeam[teamAbbr]) tokens.push(winnerTokenByTeam[teamAbbr]);
    if (loserTokenByTeam[teamAbbr]) tokens.push(loserTokenByTeam[teamAbbr]);

    return tokens;
  }

  function sideTokensMatchSeed(tokensA, tokensB, seedMatch) {
    return (
      (tokensA.includes(seedMatch.teamA) && tokensB.includes(seedMatch.teamB)) ||
      (tokensA.includes(seedMatch.teamB) && tokensB.includes(seedMatch.teamA))
    );
  }

  const knockoutMatchNumberById = (() => {
    const map = new Map();
    const knockoutMatches = scheduleMatches
      .filter((match) => match.stage === "knockout")
      .map((match) => ({ ...match, assignedMatchNumber: null }));

    if (knockoutMatches.length === 0) {
      return map;
    }

    const winnerTokenByTeam = {};
    const loserTokenByTeam = {};
    const thirdPlaceSlots = thirdPlaceMapping[getBestThirdPlaceGroupKey()] || {};

    // Round of 32: assign by actual team seed placements.
    knockoutMatches
      .filter((match) => match.round === "Round of 32")
      .forEach((match) => {
        const homeSeed = getSeedForTeam(match.home);
        const awaySeed = getSeedForTeam(match.away);

        if (!homeSeed || !awaySeed) {
          if (match.matchNumber) {
            match.assignedMatchNumber = match.matchNumber;
            map.set(match.id, match.matchNumber);
          }

          return;
        }

        const matchedSeed = knockoutSeeding
          .filter((seedMatch) => seedMatch.roundType === "Round of 32")
          .find((seedMatch) => {
            const resolvedA = resolveRoundOf32Seed(seedMatch.teamA, seedMatch, thirdPlaceSlots);
            const resolvedB = resolveRoundOf32Seed(seedMatch.teamB, seedMatch, thirdPlaceSlots);

            return (
              (resolvedA === homeSeed && resolvedB === awaySeed) ||
              (resolvedA === awaySeed && resolvedB === homeSeed)
            );
          });

        if (!matchedSeed) {
          if (match.matchNumber) {
            match.assignedMatchNumber = match.matchNumber;
            map.set(match.id, match.matchNumber);
          }

          return;
        }

        match.assignedMatchNumber = matchedSeed.matchNumber;
        map.set(match.id, matchedSeed.matchNumber);
      });

    // Build winner/loser tokens from already assigned finished matches.
    knockoutMatches.forEach((match) => {
      if (!match.assignedMatchNumber) return;

      const winner = getFinishedWinner(match);
      const loser = getFinishedLoser(match);
      const number = Number(String(match.assignedMatchNumber).replace("M", ""));

      if (winner) winnerTokenByTeam[winner] = `W${number}`;
      if (loser) loserTokenByTeam[loser] = `L${number}`;
    });

    const laterRounds = [
      "Round of 16",
      "Quarterfinals",
      "Semifinals",
      "Third Place",
      "Final",
    ];

    laterRounds.forEach((round) => {
      const roundSeedMatches = knockoutSeeding.filter(
        (seedMatch) => seedMatch.roundType === round
      );

      roundSeedMatches.forEach((seedMatch) => {
        const candidate = knockoutMatches.find((match) => {
          if (match.round !== round) return false;
          if (match.assignedMatchNumber) return false;

          const homeTokens = getPossibleSideTokens(
            match.home,
            winnerTokenByTeam,
            loserTokenByTeam
          );
          const awayTokens = getPossibleSideTokens(
            match.away,
            winnerTokenByTeam,
            loserTokenByTeam
          );

          return sideTokensMatchSeed(homeTokens, awayTokens, seedMatch);
        });

        if (!candidate) return;

        candidate.assignedMatchNumber = seedMatch.matchNumber;
        map.set(candidate.id, seedMatch.matchNumber);

        const winner = getFinishedWinner(candidate);
        const loser = getFinishedLoser(candidate);
        const number = Number(String(seedMatch.matchNumber).replace("M", ""));

        if (winner) winnerTokenByTeam[winner] = `W${number}`;
        if (loser) loserTokenByTeam[loser] = `L${number}`;
      });

      knockoutMatches
        .filter((match) => match.round === round && !match.assignedMatchNumber)
        .forEach((match) => {
          if (match.matchNumber) {
            match.assignedMatchNumber = match.matchNumber;
            map.set(match.id, match.matchNumber);
          }
        });
    });

    return map;
  })();

  function getKnockoutSeedMatch(match) {
    if (match.stage !== "knockout") return null;

    const assignedMatchNumber =
      knockoutMatchNumberById.get(match.id) || match.matchNumber || null;

    if (assignedMatchNumber) {
      const directSeedMatch = knockoutSeeding.find(
        (seedMatch) => seedMatch.matchNumber === assignedMatchNumber
      );

      if (directSeedMatch) {
        return directSeedMatch;
      }
    }

    const round = match.round || "Knockout Round";

    const roundMatches = scheduleMatches
      .filter((item) => item.stage === "knockout" && (item.round || "Knockout Round") === round)
      .sort((a, b) => dateAndTimeValue(a) - dateAndTimeValue(b));

    const roundIndex = roundMatches.findIndex((item) => {
      if (match.apiFixtureId && item.apiFixtureId) {
        return Number(item.apiFixtureId) === Number(match.apiFixtureId);
      }

      return item.id === match.id;
    });

    if (roundIndex < 0) return null;

    const seedMatchesForRound = knockoutSeeding.filter(
      (seedMatch) => seedMatch.roundType === round
    );

    return seedMatchesForRound[roundIndex] || null;
  }

  function getMatchStadium(match) {
    const seededMatch = getKnockoutSeedMatch(match);

    if (seededMatch?.venue) {
      return seededMatch.venue;
    }

    return (
      match.venue ||
      match.stadium ||
      match.fifaVenueName ||
      match.apiVenue ||
      ""
    );
  }

  function getMatchCity(match) {
    const seededMatch = getKnockoutSeedMatch(match);

    if (seededMatch?.city) {
      return seededMatch.city;
    }

    return match.city || match.apiCity || "";
  }

  function isTodayMatch(match) {
    if (
      match.status === "live" ||
      match.apiStatusShort === "1H" ||
      match.apiStatusShort === "HT" ||
      match.apiStatusShort === "2H" ||
      match.apiStatusShort === "ET" ||
      match.apiStatusShort === "BT" ||
      match.apiStatusShort === "P" ||
      match.apiStatusShort === "PEN"
    ) {
      return true;
    }

    const matchDateValue = getDateOnlyValue(match.apiDate || match.date);
    const todayValue = getTodayDateOnlyValue();

    return matchDateValue === todayValue;
  }

  function isCompletedFromPreviousDay(match) {
    if (
      match.status === "live" ||
      match.apiStatusShort === "1H" ||
      match.apiStatusShort === "HT" ||
      match.apiStatusShort === "2H" ||
      match.apiStatusShort === "ET" ||
      match.apiStatusShort === "BT" ||
      match.apiStatusShort === "P" ||
      match.apiStatusShort === "PEN"
    ) {
      return false;
    }

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
  
  const groupedMatches = scheduleMatches
    .filter(isGroupStageMatch)
    .reduce((acc, match) => {
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

  const knockoutMatchesByRound = groupKnockoutMatchesByRound(
    scheduleMatches.filter(isKnockoutMatch)
  );

  function renderMatchCard(match) {
    const isLiveFinal = match.status === "live" && match.round === "Final";
    const isLiveMexicoMatch =
      match.status === "live" && (match.home === "MEX" || match.away === "MEX");
    const isLiveUsaMatch =
      match.status === "live" && (match.home === "USA" || match.away === "USA");
    const votingClosed =
      match.status === "live" ||
      match.status === "finished" ||
      match.status === "postponed";
    const penaltyScore = getPenaltyScore(match);
    const teamsConfirmedForVoting =
      hasTeamFlag(match.home) && hasTeamFlag(match.away);
    const voteMatchId = getVoteMatchId(match);

    return (
      <div
        key={match.id}
        className={
          match.status === "live"
            ? isLiveFinal
              ? "relative border border-amber-400 bg-amber-500/10 p-3 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
              : isLiveMexicoMatch
                ? "relative border border-green-500 bg-green-500/10 p-3 shadow-[0_0_14px_rgba(34,197,94,0.3)]"
                : isLiveUsaMatch
                  ? "relative border border-blue-500 bg-blue-500/10 p-3 shadow-[0_0_14px_rgba(59,130,246,0.3)]"
                  : "relative border border-red-500 bg-red-500/10 p-3 shadow-[0_0_14px_rgba(239,68,68,0.25)]"
            : "relative border border-gray-700 p-3"
        }
      >
        {match.status === "live" && (
          <div
            className={
              isLiveFinal
                ? "absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-300"
                : isLiveMexicoMatch
                  ? "absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-green-400"
                  : isLiveUsaMatch
                    ? "absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-blue-400"
                    : "absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-red-400"
            }
          >
            <span>•LIVE</span>
          </div>
        )}

        <div className="mb-2">
          <p className="text-[11px] text-gray-400">
            {formatMatchDate(match)} • {formatMatchTime(match)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/teams?from=schedule#${match.home}`}
            className="flex items-center gap-2 min-w-0 hover:underline"
          >
            {hasTeamFlag(match.home) && (
              <Image
                src={`/flags/${match.home}.png`}
                alt={`${match.home} flag`}
                width={28}
                height={20}
                className="object-cover"
              />
            )}
            <span className="font-semibold truncate">{match.home}</span>
          </Link>

          <div className="shrink-0 text-center min-w-[42px]">
            {match.homeScore !== null && match.awayScore !== null ? (
              <>
                <span className="text-sm font-bold text-white">
                  {match.homeScore} - {match.awayScore}
                </span>

                {penaltyScore && (
                  <p className="text-[10px] font-semibold text-yellow-300">
                    {getPenaltyMainCardText(match, penaltyScore)}
                  </p>
                )}

                {!penaltyScore && getMatchStatusLabel(match) && (
                  <p
                    className={
                      match.status === "live"
                        ? isLiveFinal
                          ? "text-[10px] text-amber-300"
                          : isLiveMexicoMatch
                            ? "text-[10px] text-green-400"
                            : isLiveUsaMatch
                              ? "text-[10px] text-blue-400"
                              : "text-[10px] text-red-400"
                        : "text-[10px] text-gray-400"
                    }
                  >
                    {getMatchStatusLabel(match)}
                  </p>
                )}
              </>
            ) : (
              penaltyScore ? (
                <p className="text-[10px] font-semibold text-yellow-300">
                  {getPenaltyMainCardText(match, penaltyScore)}
                </p>
              ) : (
                <span className="text-xs text-gray-400">
                  {getMatchStatusLabel(match) || "vs"}
                </span>
              )
            )}
          </div>

          <Link
            href={`/teams?from=schedule#${match.away}`}
            className="flex items-center justify-end gap-2 min-w-0 hover:underline"
          >
            <span className="font-semibold truncate">{match.away}</span>
            {hasTeamFlag(match.away) && (
              <Image
                src={`/flags/${match.away}.png`}
                alt={`${match.away} flag`}
                width={28}
                height={20}
                className="object-cover"
              />
            )}
          </Link>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => {
              toggleMatch(match.id);

              if (!openMatches[match.id]) {
                loadMatchDetails(match);
              }
            }}
            className="text-xs text-gray-300 underline"
          >
            {openMatches[match.id] ? "Hide details" : "Show details"}
          </button>

          {getMatchCompetitionLabel(match) && (
            <span className="border border-gray-600 px-2 py-0.5 text-[10px] text-gray-300">
              {getMatchCompetitionLabel(match)}
            </span>
          )}
        </div>

        {openMatches[match.id] && (
          <div className="mt-2 border-t border-gray-700 pt-2 text-xs text-gray-300">
            <p>Location: {getMatchStadium(match)}</p>

            {shouldLoadMatchDetails(match) && (
              <div className="mt-3 border-t border-gray-700 pt-3">
                <p className="mb-2 text-xs font-semibold text-white">
                  Scorers
                </p>

                {loadingDetailsByFixture[match.apiFixtureId] ? (
                  <p className="text-xs text-gray-500">Loading scorers...</p>
                ) : getGoalEvents(match).length > 0 ? (
                  <div className="space-y-2">
                    {getGoalEvents(match).map((event, index) => (
                      <div
                        key={`${match.apiFixtureId}-goal-${index}`}
                        className="grid grid-cols-[4.5rem_1fr] gap-2 border border-gray-800 p-2 text-xs"
                      >
                        <span className="whitespace-nowrap text-gray-400 tabular-nums">
                          {formatGoalMinute(event)}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">
                              {event.player?.name || "Unknown scorer"}
                            </p>

                            {event.team?.name && (
                              <Image
                                src={`/flags/${getGoalEventFlagAbbr(event, match)}.png`}
                                alt={`${getGoalEventFlagAbbr(event, match)} flag`}
                                width={18}
                                height={12}
                                className="object-cover"
                              />
                            )}
                          </div>

                          {event.assist?.name && (
                            <p className="text-gray-400">
                              Assist: {event.assist.name}
                            </p>
                          )}

                          {formatGoalDetail(event) && (
                            <p className="text-gray-500">
                              {formatGoalDetail(event)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    No scorers yet.
                  </p>
                )}
              </div>
            )}

            {shouldShowPenaltySection(match) && (
              <div className="mt-3 border-t border-gray-700 pt-3">
                <p className="mb-2 text-xs font-semibold text-white">
                  Penalty Shootout
                </p>

                {loadingDetailsByFixture[match.apiFixtureId] ? (
                  <p className="text-xs text-gray-500">Loading match details...</p>
                ) : getPenaltyScore(match) ? (
                  <div className="border border-yellow-500/40 bg-yellow-500/10 p-2 text-xs">
                    <div className="flex items-center justify-between gap-3 font-bold text-yellow-300">
                      <span className="flex items-center gap-1">
                        {hasTeamFlag(match.home) && (
                          <Image
                            src={`/flags/${match.home}.png`}
                            alt={`${match.home} flag`}
                            width={16}
                            height={12}
                            className="object-cover"
                          />
                        )}
                        <span>{match.home}</span>
                      </span>

                      <span>
                        {getPenaltyScore(match).home} - {getPenaltyScore(match).away}
                      </span>

                      <span className="flex items-center gap-1">
                        <span>{match.away}</span>
                        {hasTeamFlag(match.away) && (
                          <Image
                            src={`/flags/${match.away}.png`}
                            alt={`${match.away} flag`}
                            width={16}
                            height={12}
                            className="object-cover"
                          />
                        )}
                      </span>
                    </div>
                  </div>
                ) : null}

                {getPenaltyEvents(match).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {getPenaltyEvents(match).map((event, index) => (
                      <div
                        key={`${match.apiFixtureId}-penalty-${index}`}
                        className="border border-gray-800 p-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">
                              {event.player?.name || "Player"}
                            </p>
                            {hasTeamFlag(getTeamAbbrByApiName(event.team?.name)) && (
                              <Image
                                src={`/flags/${getTeamAbbrByApiName(event.team?.name)}.png`}
                                alt={`${getTeamAbbrByApiName(event.team?.name)} flag`}
                                width={18}
                                height={12}
                                className="object-cover"
                              />
                            )}
                          </div>
                          <p className="text-gray-400">
                            {formatPenaltyEventDetail(event)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 border-t border-gray-700 pt-3">
              <p className="mb-2 text-xs font-semibold text-white">
                Who will win?
              </p>

              {votingClosed && (
                <p className="mb-2 text-[11px] text-gray-400">
                  Voting closed once match starts.
                </p>
              )}

              {!votingClosed && !teamsConfirmedForVoting && (
                <p className="mb-2 text-[11px] text-gray-400">
                  Voting opens once both teams are confirmed.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleVote(voteMatchId, match.home)}
                  disabled={
                    votingMatch === voteMatchId ||
                    votingClosed ||
                    !teamsConfirmedForVoting
                  }
                  className={
                    myVotes[voteMatchId] === match.home
                      ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  }
                >
                  {hasTeamFlag(match.home) && (
                    <Image
                      src={`/flags/${match.home}.png`}
                      alt={`${match.home} flag`}
                      width={18}
                      height={12}
                      className="object-cover"
                    />
                  )}
                  <span>{match.home}</span>
                  <span className="text-gray-300">
                    ({getVoteCount(voteMatchId, match.home)})
                  </span>
                </button>

                {match.stage !== "knockout" && (
                  <button
                    onClick={() => handleVote(voteMatchId, "DRAW")}
                    disabled={votingMatch === voteMatchId || votingClosed}
                    className={
                      myVotes[voteMatchId] === "DRAW"
                        ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    }
                  >
                    <span>Draw</span>
                    <span className="text-gray-300">
                      ({getVoteCount(voteMatchId, "DRAW")})
                    </span>
                  </button>
                )}

                <button
                  onClick={() => handleVote(voteMatchId, match.away)}
                  disabled={
                    votingMatch === voteMatchId ||
                    votingClosed ||
                    !teamsConfirmedForVoting
                  }
                  className={
                    myVotes[voteMatchId] === match.away
                      ? "flex items-center gap-2 border border-yellow-400 bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      : "flex items-center gap-2 border border-gray-600 bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  }
                >
                  {hasTeamFlag(match.away) && (
                    <Image
                      src={`/flags/${match.away}.png`}
                      alt={`${match.away} flag`}
                      width={18}
                      height={12}
                      className="object-cover"
                    />
                  )}
                  <span>{match.away}</span>
                  <span className="text-gray-300">
                    ({getVoteCount(voteMatchId, match.away)})
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
        className="absolute right-4 top-4 hidden h-10 w-10 object-contain sm:block"
      />

      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Match Schedule</h1>

      <p className="mb-2 text-xs text-gray-400">
        {liveDataStatus === "connected"
          ? `Live data connected${liveUpdatedAt ? ` • Updated ${new Date(liveUpdatedAt).toLocaleTimeString()}` : ""}`
          : liveDataStatus === "loading"
            ? "Loading live data..."
            : "Using saved schedule data."}
      </p>

      <div className="mb-6 grid w-full grid-cols-3 border border-white text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => changeScheduleView("datetime")}
          className={
            scheduleView === "datetime"
              ? "w-full bg-white px-3 py-2 font-semibold text-black"
              : "w-full bg-black px-3 py-2 font-semibold text-white hover:bg-gray-800"
          }
        >
          All
        </button>

        <button
          type="button"
          onClick={() => changeScheduleView("knockout")}
          className={
            scheduleView === "knockout"
              ? "w-full bg-white px-3 py-2 font-semibold text-black"
              : "w-full bg-black px-3 py-2 font-semibold text-white hover:bg-gray-800"
          }
        >
          KO View
        </button>

        <button
          type="button"
          onClick={() => changeScheduleView("group")}
          className={
            scheduleView === "group"
              ? "w-full bg-white px-3 py-2 font-semibold text-black"
              : "w-full bg-black px-3 py-2 font-semibold text-white hover:bg-gray-800"
          }
        >
          Group View
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
            onClick={toggleCompletedMatches}
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
        <div className="space-y-8">
          <nav
            aria-label="Group navigation"
            className="flex justify-center overflow-x-auto"
          >
            <div className="flex w-max items-center gap-0.5 rounded-full border border-gray-700 bg-black/80 px-2 py-1">
              {groupKeys.map((group) => (
                <a
                  key={group}
                  href={`#group-${group}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white hover:bg-gray-700"
                >
                  {group}
                </a>
              ))}
            </div>
          </nav>

          {groupKeys.map((group) => (
            <section
              key={group}
              id={`group-${group}`}
              className="scroll-mt-6 space-y-3"
            >
              <button
                type="button"
                onClick={() => toggleScheduleGroup(group)}
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white pb-2 text-left"
              >
                <h2 className="text-lg sm:text-xl font-semibold">
                  Group {group}
                </h2>

                <div className="flex min-w-0 justify-center">
                  {openScheduleGroups[group] === false && (
                    <div className="flex items-center justify-center gap-1 overflow-hidden">
                      {getTeamsForGroup(group).map((team) => (
                        <div
                          key={`${group}-${team.abbr}`}
                          className="flex items-center gap-1"
                          title={team.name}
                        >
                          <Image
                            src={`/flags/${team.abbr}.png`}
                            alt={`${team.name} flag`}
                            width={18}
                            height={12}
                            className="object-cover"
                          />

                          <span className="hidden text-[10px] font-semibold text-gray-400 sm:inline">
                            {team.abbr}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-xs text-gray-300">
                  {openScheduleGroups[group] === false ? "Show" : "Hide"}
                </span>
              </button>

              {openScheduleGroups[group] !== false && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                  {groupedMatches[group].map((match) => renderMatchCard(match))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : scheduleView === "knockout" ? (
        <section className="space-y-6">
          <div className="pb-2 border-b border-white">
            <h2 className="text-lg sm:text-xl font-semibold">
              Knockout Matches
            </h2>
          </div>

          {knockoutMatchesByRound.length > 0 ? (
            knockoutMatchesByRound.map((roundData) => (
              <div key={roundData.round} className="space-y-3">
                <div className="border-b border-gray-700 pb-2">
                  <h3 className="text-base sm:text-lg font-semibold text-white">
                    {roundData.round}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                  {roundData.matches.map((match) => renderMatchCard(match))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">
              Knockout matches will appear here once they are available.
            </p>
          )}
        </section>
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