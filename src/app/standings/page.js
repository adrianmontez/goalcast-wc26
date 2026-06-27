"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import TabBar from "@/components/TabBar";
import { groups } from "@/data/wc2026Data";
import Link from "next/link";
import { knockoutSeeding } from "@/data/knockoutSeeding";
import { thirdPlaceMapping } from "@/data/thirdPlaceMapping";

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

function addManualOrderAndSort(apiStandings) {
  return apiStandings.map((groupData) => {
    const hasApiRanks = groupData.teams.every(
      (team) => typeof team.rank === "number"
    );

    return {
      ...groupData,
      teams: hasApiRanks
        ? [...groupData.teams].sort((a, b) => a.rank - b.rank)
        : sortStandingsTeams(
            groupData.teams.map((team, index) => ({
              ...team,
              manualOrder: getManualOrder(team, index),
            }))
          ),
    };
  });
}

const knockoutDisplayOrderByRound = {
  "Round of 32": [
    "M74", "M77", "M73", "M75",
    "M83", "M84", "M81", "M82",
    "M76", "M78", "M79", "M80",
    "M86", "M88", "M85", "M87",
  ],
  "Round of 16": ["M89", "M90", "M93", "M94", "M91", "M92", "M95", "M96"],
  Quarterfinals: ["M97", "M98", "M99", "M100"],
  Semifinals: ["M101", "M102"],
  "Third Place": ["M103"],
  Final: ["M104"],
};

function getKnockoutDisplayIndex(round, matchNumber) {
  const roundOrder = knockoutDisplayOrderByRound[round];

  if (!roundOrder || !matchNumber) return 9999;

  const index = roundOrder.indexOf(matchNumber);
  return index === -1 ? 9999 : index;
}

function getTeamAtRankFromStandings(standingsData, groupId, rank) {
  const groupData = standingsData.find(
    (group) => String(group.group) === String(groupId)
  );

  if (!groupData) return null;

  const teamAtRank = groupData.teams[Number(rank) - 1];
  return teamAtRank?.abbr || null;
}

function resolveKnockoutSeedLabel(seed, seedMatch, standingsData, matchResultsByNumber) {
  if (!seed) {
    return { label: "TBD", confirmed: false };
  }

  if (/^[12][A-L]$/.test(seed)) {
    const team = getTeamAtRankFromStandings(standingsData, seed[1], seed[0]);
    return {
      label: team || "TBD",
      confirmed: Boolean(team),
    };
  }

  if (/^3[A-L]$/.test(seed)) {
    const team = getTeamAtRankFromStandings(standingsData, seed[1], 3);
    return {
      label: team || "TBD",
      confirmed: Boolean(team),
    };
  }

  if (/^3[A-L]{2,}$/.test(seed)) {
    const thirdPlaceGroupKey = getBestThirdPlaceGroupKey(standingsData);
    const thirdPlaceSlots = thirdPlaceMapping[thirdPlaceGroupKey] || {};
    const mappedSeed = thirdPlaceSlots[seedMatch.matchNumber];

    if (!mappedSeed || !/^3[A-L]$/.test(mappedSeed)) {
      return { label: "TBD", confirmed: false };
    }

    const team = getTeamAtRankFromStandings(standingsData, mappedSeed[1], 3);
    return {
      label: team || "TBD",
      confirmed: Boolean(team),
    };
  }

  if (/^W\d+$/.test(seed)) {
    const previousResult = matchResultsByNumber[`M${seed.slice(1)}`];
    return {
      label: previousResult?.winner || "TBD",
      confirmed: Boolean(previousResult?.winner),
    };
  }

  if (/^L\d+$/.test(seed)) {
    const previousResult = matchResultsByNumber[`M${seed.slice(1)}`];
    return {
      label: previousResult?.loser || "TBD",
      confirmed: Boolean(previousResult?.loser),
    };
  }

  return {
    label: seed || "TBD",
    confirmed: hasTeamFlag(seed),
  };
}

function groupKnockoutMatchesByRound(matchesToGroup, standingsData) {
  const roundOrder = [
    "Round of 32",
    "Round of 16",
    "Quarterfinals",
    "Semifinals",
    "Third Place",
    "Final",
  ];

  const matchesWithNumbers = assignMatchNumbersToKnockoutMatches(
    matchesToGroup,
    standingsData
  );

  const grouped = roundOrder.reduce((current, round) => {
    current[round] = [];
    return current;
  }, {});

  const matchResultsByNumber = {};
  const assignedMatchNumbers = new Set();

  matchesWithNumbers.forEach((match) => {
    const round = match.round || "Knockout Round";

    if (!grouped[round]) grouped[round] = [];
    grouped[round].push(match);

    if (!match.bracketMatchNumber) return;

    assignedMatchNumbers.add(match.bracketMatchNumber);

    matchResultsByNumber[match.bracketMatchNumber] = {
      winner: getFinishedMatchWinnerAbbr(match),
      loser: getFinishedMatchLoserAbbr(match),
    };
  });

  knockoutSeeding.forEach((seedMatch) => {
    if (assignedMatchNumbers.has(seedMatch.matchNumber)) return;

    const home = resolveKnockoutSeedLabel(
      seedMatch.teamA,
      seedMatch,
      standingsData,
      matchResultsByNumber
    );
    const away = resolveKnockoutSeedLabel(
      seedMatch.teamB,
      seedMatch,
      standingsData,
      matchResultsByNumber
    );

    grouped[seedMatch.roundType].push({
      id: `placeholder-${seedMatch.matchNumber}`,
      stage: "knockout",
      round: seedMatch.roundType,
      bracketMatchNumber: seedMatch.matchNumber,
      home: home.label,
      away: away.label,
      homeConfirmed: home.confirmed,
      awayConfirmed: away.confirmed,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      apiStatusShort: "NS",
      apiStatusLong: "Awaiting fixture confirmation",
      city: "City TBD",
      isPlaceholder: true,
    });
  });

  return roundOrder
    .filter((round) => grouped[round])
    .map((round) => ({
      round,
      matches: grouped[round].sort((a, b) => {
        const aSeedMatch = getSeedMatchByMatchNumber(a.bracketMatchNumber);
        const bSeedMatch = getSeedMatchByMatchNumber(b.bracketMatchNumber);
        const aMatchNumber = a.bracketMatchNumber || aSeedMatch?.matchNumber;
        const bMatchNumber = b.bracketMatchNumber || bSeedMatch?.matchNumber;

        const aDisplayIndex = getKnockoutDisplayIndex(round, aMatchNumber);
        const bDisplayIndex = getKnockoutDisplayIndex(round, bMatchNumber);

        if (aDisplayIndex !== bDisplayIndex) {
          return aDisplayIndex - bDisplayIndex;
        }

        const aSeedIndex = aSeedMatch
          ? knockoutSeeding.findIndex(
              (seedMatch) => seedMatch.matchNumber === aSeedMatch.matchNumber
            )
          : 9999;

        const bSeedIndex = bSeedMatch
          ? knockoutSeeding.findIndex(
              (seedMatch) => seedMatch.matchNumber === bSeedMatch.matchNumber
            )
          : 9999;

        if (aSeedIndex !== bSeedIndex) return aSeedIndex - bSeedIndex;

        return (
          new Date(a.apiDate || a.date || 0) -
          new Date(b.apiDate || b.date || 0)
        );
      }),
    }));
}

function hasTeamFlag(teamAbbr) {
  return /^[A-Z]{3}$/.test(String(teamAbbr || ""));
}

function getKnockoutStatusLabel(match) {
  if (match.apiStatusShort === "NS") return "Scheduled";
  if (match.apiStatusShort === "FT") return "Final";
  if (match.apiStatusShort === "AET") return "Final after extra time";
  if (match.apiStatusShort === "PEN") return "Final after penalties";
  if (match.status === "live") return "Live";

  return match.apiStatusLong || match.status || "Scheduled";
}

function getKnockoutCity(match) {
  return match.city || match.apiCity || "City TBD";
}

function getKnockoutCardFooter(match) {
  if (match.isPlaceholder) {
    return "";
  }

  const city = getKnockoutCity(match);

  if (match.status === "live") {
    return `Live • ${city}`;
  }

  if (
    match.apiStatusShort === "FT" ||
    match.apiStatusShort === "AET" ||
    match.apiStatusShort === "PEN"
  ) {
    return `${getKnockoutStatusLabel(match)} • ${city}`;
  }

  return city;
}

function isGroupPlayComplete(standingsData) {
  return (
    standingsData.length > 0 &&
    standingsData.every((groupData) =>
      groupData.teams.every((team) => Number(team.mp || 0) >= 3)
    )
  );
}

function getWorldCupWinner(knockoutMatchesData) {
  const finalMatch = knockoutMatchesData.find(
    (match) => match.round === "Final"
  );

  if (!finalMatch) return null;

  const finalIsComplete =
    finalMatch.apiStatusShort === "FT" ||
    finalMatch.apiStatusShort === "AET" ||
    finalMatch.apiStatusShort === "PEN";

  if (!finalIsComplete) return null;

  if (finalMatch.homeWinner === true) {
    return {
      abbr: finalMatch.home,
      name: finalMatch.homeName || finalMatch.home,
    };
  }

  if (finalMatch.awayWinner === true) {
    return {
      abbr: finalMatch.away,
      name: finalMatch.awayName || finalMatch.away,
    };
  }

  const homeScore = Number(finalMatch.homeScore);
  const awayScore = Number(finalMatch.awayScore);

  if (homeScore > awayScore) {
    return {
      abbr: finalMatch.home,
      name: finalMatch.homeName || finalMatch.home,
    };
  }

  if (awayScore > homeScore) {
    return {
      abbr: finalMatch.away,
      name: finalMatch.awayName || finalMatch.away,
    };
  }

  const homePenaltyScore = Number(finalMatch.penaltyHomeScore);
  const awayPenaltyScore = Number(finalMatch.penaltyAwayScore);

  if (homePenaltyScore > awayPenaltyScore) {
    return {
      abbr: finalMatch.home,
      name: finalMatch.homeName || finalMatch.home,
    };
  }

  if (awayPenaltyScore > homePenaltyScore) {
    return {
      abbr: finalMatch.away,
      name: finalMatch.awayName || finalMatch.away,
    };
  }

  return null;
}

function getTeamRankInGroup(groupData, teamAbbr) {
  return groupData.teams.findIndex((team) => team.abbr === teamAbbr) + 1;
}

function getThirdPlaceTeams(standingsData) {
  return standingsData
    .map((groupData) => {
      const thirdPlaceTeam = groupData.teams[2];

      if (!thirdPlaceTeam) return null;

      return {
        ...thirdPlaceTeam,
        group: groupData.group,
        groupRank: 3,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return String(a.group).localeCompare(String(b.group));
    });
}

function getAdvancedTeamAbbrs(standingsData) {
  const advanced = new Set();

  standingsData.forEach((groupData) => {
    groupData.teams.slice(0, 2).forEach((team) => {
      advanced.add(team.abbr);
    });
  });

  const bestThirdPlaceTeams = getThirdPlaceTeams(standingsData).slice(0, 8);

  bestThirdPlaceTeams.forEach((team) => {
    advanced.add(team.abbr);
  });

  return advanced;
}

function getBestThirdPlaceGroupKey(standingsData) {
  return getThirdPlaceTeams(standingsData)
    .slice(0, 8)
    .map((team) => team.group)
    .sort()
    .join("");
}

function getSeedForTeam(standingsData, teamAbbr) {
  for (const groupData of standingsData) {
    const rank = getTeamRankInGroup(groupData, teamAbbr);

    if (rank > 0) {
      return `${rank}${groupData.group}`;
    }
  }

  return null;
}

function resolveRoundOf32SeedSlot(seedValue, seedMatch, thirdPlaceSlots) {
  if (/^3[A-L]{2,}$/.test(seedValue)) {
    return thirdPlaceSlots[seedMatch.matchNumber] || seedValue;
  }

  return seedValue;
}

function getBracketOrderBySeed(standingsData) {
  const orderMap = {};
  const thirdPlaceGroupKey = getBestThirdPlaceGroupKey(standingsData);
  const thirdPlaceSlots = thirdPlaceMapping[thirdPlaceGroupKey] || {};

  knockoutSeeding.forEach((seedMatch, index) => {
    if (seedMatch.roundType !== "Round of 32") {
      orderMap[seedMatch.matchNumber] = index + 1;
      return;
    }

    orderMap[seedMatch.matchNumber] = index + 1;

    const resolvedTeamA = resolveRoundOf32SeedSlot(
      seedMatch.teamA,
      seedMatch,
      thirdPlaceSlots
    );
    const resolvedTeamB = resolveRoundOf32SeedSlot(
      seedMatch.teamB,
      seedMatch,
      thirdPlaceSlots
    );

    orderMap[`${resolvedTeamA}-${resolvedTeamB}`] = index + 1;
    orderMap[`${resolvedTeamB}-${resolvedTeamA}`] = index + 1;
  });

  return orderMap;
}

function getLiveMatchBracketOrder(match, standingsData) {
  const homeSeed = getSeedForTeam(standingsData, match.home);
  const awaySeed = getSeedForTeam(standingsData, match.away);

  if (!homeSeed || !awaySeed) return 9999;

  const thirdPlaceGroupKey = getBestThirdPlaceGroupKey(standingsData);
  const thirdPlaceSlots = thirdPlaceMapping[thirdPlaceGroupKey] || {};

  const roundOf32Matches = knockoutSeeding.filter(
    (seedMatch) => seedMatch.roundType === "Round of 32"
  );

  const matchingSeedMatch = roundOf32Matches.find((seedMatch) => {
    const resolvedTeamA = resolveRoundOf32SeedSlot(
      seedMatch.teamA,
      seedMatch,
      thirdPlaceSlots
    );
    const resolvedTeamB = resolveRoundOf32SeedSlot(
      seedMatch.teamB,
      seedMatch,
      thirdPlaceSlots
    );

    return (
      (resolvedTeamA === homeSeed && resolvedTeamB === awaySeed) ||
      (resolvedTeamA === awaySeed && resolvedTeamB === homeSeed)
    );
  });

  if (!matchingSeedMatch) return 9999;

  return knockoutSeeding.findIndex(
    (seedMatch) => seedMatch.matchNumber === matchingSeedMatch.matchNumber
  ) + 1;
}

function getSeedMatchByMatchNumber(matchNumber) {
  return knockoutSeeding.find((seedMatch) => seedMatch.matchNumber === matchNumber);
}

function getMatchNumberValue(matchNumber) {
  return Number(String(matchNumber || "").replace("M", "")) || 9999;
}


function resolveRoundOf32Seed(seedMatch, standingsData) {
  const thirdPlaceGroupKey = getBestThirdPlaceGroupKey(standingsData);
  const thirdPlaceSlots = thirdPlaceMapping[thirdPlaceGroupKey] || {};

  return {
    teamA: resolveRoundOf32SeedSlot(seedMatch.teamA, seedMatch, thirdPlaceSlots),
    teamB: resolveRoundOf32SeedSlot(seedMatch.teamB, seedMatch, thirdPlaceSlots),
  };
}

function getRoundOf32MatchNumber(match, standingsData) {
  const homeSeed = getSeedForTeam(standingsData, match.home);
  const awaySeed = getSeedForTeam(standingsData, match.away);

  if (!homeSeed || !awaySeed) return null;

  const roundOf32SeedMatches = knockoutSeeding.filter(
    (seedMatch) => seedMatch.roundType === "Round of 32"
  );

  const matchingSeedMatch = roundOf32SeedMatches.find((seedMatch) => {
    const resolved = resolveRoundOf32Seed(seedMatch, standingsData);

    return (
      (resolved.teamA === homeSeed && resolved.teamB === awaySeed) ||
      (resolved.teamA === awaySeed && resolved.teamB === homeSeed)
    );
  });

  return matchingSeedMatch?.matchNumber || null;
}

function getFixtureIdFromApiTeamName(apiTeamName) {
  const text = String(apiTeamName || "");
  const match = text.match(/(\d{6,})/);

  return match ? Number(match[1]) : null;
}

function getFinishedMatchWinnerAbbr(match) {
  const isFinished =
    match.apiStatusShort === "FT" ||
    match.apiStatusShort === "AET" ||
    match.apiStatusShort === "PEN";

  if (!isFinished) return null;

  if (match.homeWinner === true) return match.home;
  if (match.awayWinner === true) return match.away;

  const homeScore = Number(match.homeScore);
  const awayScore = Number(match.awayScore);

  if (homeScore > awayScore) return match.home;
  if (awayScore > homeScore) return match.away;

  const homePenaltyScore = Number(match.penaltyHomeScore);
  const awayPenaltyScore = Number(match.penaltyAwayScore);

  if (homePenaltyScore > awayPenaltyScore) return match.home;
  if (awayPenaltyScore > homePenaltyScore) return match.away;

  return null;
}

function getFinishedMatchLoserAbbr(match) {
  const winnerAbbr = getFinishedMatchWinnerAbbr(match);

  if (!winnerAbbr) return null;

  if (winnerAbbr === match.home) return match.away;
  if (winnerAbbr === match.away) return match.home;

  return null;
}

function getPossibleSideTokens({
  side,
  match,
  fixtureIdToMatchNumber,
  winnerAbbrToToken,
  loserAbbrToToken,
}) {
  const apiName = side === "home" ? match.apiHomeName : match.apiAwayName;
  const teamAbbr = side === "home" ? match.home : match.away;

  const tokens = [];

  const sourceFixtureId = getFixtureIdFromApiTeamName(apiName);

  if (sourceFixtureId && fixtureIdToMatchNumber[sourceFixtureId]) {
    tokens.push(`W${getMatchNumberValue(fixtureIdToMatchNumber[sourceFixtureId])}`);
  }

  if (winnerAbbrToToken[teamAbbr]) {
    tokens.push(winnerAbbrToToken[teamAbbr]);
  }

  if (loserAbbrToToken[teamAbbr]) {
    tokens.push(loserAbbrToToken[teamAbbr]);
  }

  return tokens;
}

function sideTokensMatchSeed(tokensA, tokensB, seedMatch) {
  return (
    (tokensA.includes(seedMatch.teamA) && tokensB.includes(seedMatch.teamB)) ||
    (tokensA.includes(seedMatch.teamB) && tokensB.includes(seedMatch.teamA))
  );
}

function assignMatchNumbersToKnockoutMatches(knockoutMatchesData, standingsData) {
  const assignedMatches = knockoutMatchesData.map((match) => ({
    ...match,
    bracketMatchNumber: null,
  }));

  const fixtureIdToMatchNumber = {};
  const winnerAbbrToToken = {};
  const loserAbbrToToken = {};

  // First assign Round of 32 by actual group seeds.
  assignedMatches.forEach((match) => {
    if (match.round !== "Round of 32") return;

    const matchNumber = getRoundOf32MatchNumber(match, standingsData);

    if (!matchNumber) return;

    match.bracketMatchNumber = matchNumber;

    if (match.apiFixtureId) {
      fixtureIdToMatchNumber[Number(match.apiFixtureId)] = matchNumber;
    }

    const winnerAbbr = getFinishedMatchWinnerAbbr(match);
    const loserAbbr = getFinishedMatchLoserAbbr(match);
    const numberValue = getMatchNumberValue(matchNumber);

    if (winnerAbbr) winnerAbbrToToken[winnerAbbr] = `W${numberValue}`;
    if (loserAbbr) loserAbbrToToken[loserAbbr] = `L${numberValue}`;
  });

  const laterRounds = [
    "Round of 16",
    "Quarterfinals",
    "Semifinals",
    "Third Place",
    "Final",
  ];

  // Then assign every later round using either API "Winner of fixture" placeholders
  // or actual winners/losers after teams are known.
  laterRounds.forEach((round) => {
    const seedMatchesForRound = knockoutSeeding.filter(
      (seedMatch) => seedMatch.roundType === round
    );

    seedMatchesForRound.forEach((seedMatch) => {
      const alreadyAssigned = assignedMatches.some(
        (match) => match.bracketMatchNumber === seedMatch.matchNumber
      );

      if (alreadyAssigned) return;

      const matchingLiveMatch = assignedMatches.find((match) => {
        if (match.bracketMatchNumber) return false;
        if (match.round !== round) return false;

        const homeTokens = getPossibleSideTokens({
          side: "home",
          match,
          fixtureIdToMatchNumber,
          winnerAbbrToToken,
          loserAbbrToToken,
        });

        const awayTokens = getPossibleSideTokens({
          side: "away",
          match,
          fixtureIdToMatchNumber,
          winnerAbbrToToken,
          loserAbbrToToken,
        });

        return sideTokensMatchSeed(homeTokens, awayTokens, seedMatch);
      });

      if (!matchingLiveMatch) return;

      matchingLiveMatch.bracketMatchNumber = seedMatch.matchNumber;

      if (matchingLiveMatch.apiFixtureId) {
        fixtureIdToMatchNumber[Number(matchingLiveMatch.apiFixtureId)] =
          seedMatch.matchNumber;
      }

      const winnerAbbr = getFinishedMatchWinnerAbbr(matchingLiveMatch);
      const loserAbbr = getFinishedMatchLoserAbbr(matchingLiveMatch);
      const numberValue = getMatchNumberValue(seedMatch.matchNumber);

      if (winnerAbbr) winnerAbbrToToken[winnerAbbr] = `W${numberValue}`;
      if (loserAbbr) loserAbbrToToken[loserAbbr] = `L${numberValue}`;
    });
  });

  return assignedMatches;
}

export default function Standings() {
  const [standings, setStandings] = useState(() => buildInitialStandings(groups));
  const [liveDataStatus, setLiveDataStatus] = useState("loading");
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(null);

  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [bracketDataStatus, setBracketDataStatus] = useState("loading");
  const [bracketUpdatedAt, setBracketUpdatedAt] = useState(null);

  const [expandedStandingsGroups, setExpandedStandingsGroups] = useState({});
  const [expandedStandingsGroupsLoaded, setExpandedStandingsGroupsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveStandings() {
      try {
        const response = await fetch("/api/live/standings");
        const data = await response.json();

        if (cancelled) return;

        if (data.standings) {
          setStandings(addManualOrderAndSort(data.standings));
          setLiveUpdatedAt(data.updatedAt || null);
          setLiveDataStatus(data.ok ? "live" : "static");
        } else {
          setLiveDataStatus("static");
        }
      } catch (error) {
        console.error("Could not load live standings:", error);
        setLiveDataStatus("static");
      }
    }

    loadLiveStandings();

    const interval = setInterval(loadLiveStandings, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadKnockoutMatches() {
      try {
        const response = await fetch("/api/live/matches", {
          cache: "no-store",
        });

        const data = await response.json();

        if (cancelled) return;

        if (data.ok && data.matches) {
          setKnockoutMatches(
            data.matches.filter((match) => match.stage === "knockout")
          );
          setBracketUpdatedAt(data.updatedAt || null);
          setBracketDataStatus("live");
        } else {
          setBracketDataStatus("static");
        }
      } catch (error) {
        console.error("Could not load knockout matches:", error);
        setBracketDataStatus("static");
      }
    }

    loadKnockoutMatches();

    const interval = setInterval(loadKnockoutMatches, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      const saved = localStorage.getItem("goalcast_expanded_standings_groups");

      if (cancelled) return;

      if (saved) {
        try {
          setExpandedStandingsGroups(JSON.parse(saved));
        } catch {
          setExpandedStandingsGroups({});
        }
      }

      setExpandedStandingsGroupsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!expandedStandingsGroupsLoaded) return;

    localStorage.setItem(
      "goalcast_expanded_standings_groups",
      JSON.stringify(expandedStandingsGroups)
    );
  }, [expandedStandingsGroups, expandedStandingsGroupsLoaded]);

  useEffect(() => {
    localStorage.setItem("goalcast_last_standings_view", "/standings");
  }, []);

  function toggleGroupExtraStats(groupKey) {
    setExpandedStandingsGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  const knockoutMatchesByRound = groupKnockoutMatchesByRound(
    knockoutMatches,
    standings
  );

  const advancedTeamAbbrs = getAdvancedTeamAbbrs(standings);
  const worldCupWinner = getWorldCupWinner(knockoutMatches);

  return (
    <main className="relative min-h-screen bg-black text-white p-4 sm:p-6 pb-20 sm:pb-14">
      <div className="absolute top-4 right-4 h-[50px] w-[50px]">
        <Image
          src="/images/goalcast_trophy.png"
          alt="GoalCast Trophy"
          fill
          sizes="50px"
          className="object-contain"
        />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-6">GoalCast WC26</h1>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold">
            Knockout Bracket
          </h2>
        </div>

        <p className="mb-4 text-xs text-gray-400">
          {worldCupWinner ? (
            <>
              Congratulations {worldCupWinner.name}!{" "}
              {hasTeamFlag(worldCupWinner.abbr) && (
                <>
                  <Image
                    src={`/flags/${worldCupWinner.abbr}.png`}
                    alt={`${worldCupWinner.name} flag`}
                    width={18}
                    height={12}
                    className="inline-block object-cover"
                  />{" "}
                  <Image
                    src={`/flags/${worldCupWinner.abbr}.png`}
                    alt={`${worldCupWinner.name} flag`}
                    width={18}
                    height={12}
                    className="inline-block object-cover"
                  />{" "}
                  <Image
                    src={`/flags/${worldCupWinner.abbr}.png`}
                    alt={`${worldCupWinner.name} flag`}
                    width={18}
                    height={12}
                    className="inline-block object-cover"
                  />
                </>
              )}
            </>
          ) : bracketDataStatus === "live" ? (
            <>
              Live bracket connected
              {bracketUpdatedAt
                ? ` • Updated ${new Date(bracketUpdatedAt).toLocaleTimeString()}`
                : ""}
            </>
          ) : bracketDataStatus === "loading" ? (
            "Loading live bracket..."
          ) : (
            "Using saved bracket data"
          )}
        </p>

        {knockoutMatchesByRound.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="grid min-w-[820px] grid-cols-6 gap-3">
              {knockoutMatchesByRound.map((roundData) => (
                <div key={roundData.round} className="space-y-3">
                  <h3 className="border-b border-gray-700 pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {roundData.round}
                  </h3>

                  {roundData.matches.map((match) => (
                    <div
                      key={match.id}
                      className={
                        match.status === "live"
                          ? "border border-red-500 bg-red-500/10 p-2 text-xs shadow-[0_0_14px_rgba(239,68,68,0.25)]"
                          : "border border-gray-700 bg-black p-2 text-xs"
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {hasTeamFlag(match.home) &&
                            (!match.isPlaceholder || match.homeConfirmed) && (
                            <Image
                              src={`/flags/${match.home}.png`}
                              alt={`${match.home} flag`}
                              width={18}
                              height={12}
                              className="object-cover"
                            />
                          )}

                          <span className="truncate font-semibold text-white">
                            {match.home}
                          </span>
                        </div>

                        <span className="shrink-0 font-bold text-white">
                          {match.homeScore ?? "-"}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {hasTeamFlag(match.away) &&
                            (!match.isPlaceholder || match.awayConfirmed) && (
                            <Image
                              src={`/flags/${match.away}.png`}
                              alt={`${match.away} flag`}
                              width={18}
                              height={12}
                              className="object-cover"
                            />
                          )}

                          <span className="truncate font-semibold text-white">
                            {match.away}
                          </span>
                        </div>

                        <span className="shrink-0 font-bold text-white">
                          {match.awayScore ?? "-"}
                        </span>
                      </div>

                      <div className="mt-2 text-center">
                        <p
                          className={
                            match.status === "live"
                              ? "truncate text-[8px] font-bold text-red-400"
                              : "truncate text-[8px] text-gray-500"
                          }
                          title={getKnockoutCardFooter(match)}
                        >
                          {getKnockoutCardFooter(match)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-white p-3 sm:p-4 text-sm sm:text-base text-gray-400">
            Bracket will appear here once knockout matches are available from live data.
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3">
          Group Standings
        </h2>

        <p className="mb-4 text-xs text-gray-400">
          {isGroupPlayComplete(standings)
            ? "Group play complete!"
            : liveDataStatus === "live"
              ? `Live standings connected${
                  liveUpdatedAt
                    ? ` • Updated ${new Date(liveUpdatedAt).toLocaleTimeString()}`
                    : ""
                }`
              : liveDataStatus === "loading"
                ? "Loading live standings..."
                : "Using saved standings data"}
        </p>

        <div className="mb-6 flex flex-col gap-3 sm:relative sm:min-h-[2.25rem] sm:justify-center">
          <Link
            href="/teams"
            className="inline-flex w-fit items-center gap-2 rounded border border-white bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-900 sm:absolute sm:left-0 sm:top-1/2 sm:-translate-y-1/2"
          >
            <span>Teams</span>
            <Image
              src="/flags/MEX.png"
              alt="Mexico flag"
              width={18}
              height={12}
              className="object-cover"
            />
            <Image
              src="/flags/USA.png"
              alt="USA flag"
              width={18}
              height={12}
              className="object-cover"
            />
            <Image
              src="/flags/CAN.png"
              alt="Canada flag"
              width={18}
              height={12}
              className="object-cover"
            />
          </Link>

          <nav
            aria-label="Group standings navigation"
            className="min-w-0 overflow-x-auto sm:flex sm:justify-center"
          >
            <div className="mx-auto flex w-max items-center gap-0.5 rounded-full border border-gray-700 bg-black/80 px-2 py-1">
              {standings.map((groupData) => (
                <a
                  key={groupData.group}
                  href={`#standings-group-${groupData.group}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white hover:bg-gray-700"
                >
                  {groupData.group}
                </a>
              ))}
            </div>
          </nav>
        </div>

        <div className="space-y-6">
          {standings.map((groupData) => {
            const groupExpanded = Boolean(expandedStandingsGroups[groupData.group]);

            const standingsTableWidthClass = groupExpanded
              ? "min-w-[560px] sm:min-w-[760px]"
              : "min-w-0";

            const standingsGridClass = groupExpanded
              ? "grid-cols-[2rem_5rem_repeat(8,minmax(2.25rem,1fr))] sm:grid-cols-[2rem_13rem_repeat(8,minmax(2.75rem,1fr))]"
              : "grid-cols-[2rem_5rem_repeat(5,minmax(2rem,1fr))] sm:grid-cols-[2rem_13rem_repeat(5,minmax(2.75rem,1fr))]";

            return (
              <div
                key={groupData.group}
                id={`standings-group-${groupData.group}`}
                className="scroll-mt-6"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-semibold">
                    Group {groupData.group}
                  </h3>

                  <button
                    type="button"
                    onClick={() => toggleGroupExtraStats(groupData.group)}
                    className="shrink-0 border border-gray-600 px-2 py-1 text-[10px] sm:text-xs text-gray-300 hover:bg-gray-800"
                  >
                    {groupExpanded ? "Hide" : "Expand"}
                  </button>
                </div>

              <div className="overflow-x-auto">
                <div className={`${standingsTableWidthClass} w-full border border-white`}>
                  <div
                  className={`grid ${standingsGridClass} border-b border-white p-2 text-xs sm:text-sm font-bold`}
                >
                  <span></span>
                  <span>Team</span>
                  <span className="text-center">MP</span>
                  <span className="text-center">W</span>
                  <span className="text-center">D</span>
                  <span className="text-center">L</span>
                  <span className="text-center">Pts</span>

                  {groupExpanded && (
                    <>
                      <span className="text-center">GF</span>
                      <span className="text-center">GA</span>
                      <span className="text-center">GD</span>
                    </>
                  )}
                </div>

                  {groupData.teams.map((team) => (
                    <div
                      key={team.abbr}
                      className={
                        advancedTeamAbbrs.has(team.abbr)
                          ? `grid ${standingsGridClass} border-b border-amber-300/70 bg-amber-300/15 shadow-[inset_3px_0_0_rgba(252,211,77,0.95)] last:border-b-0 p-2 text-xs sm:text-sm items-center`
                          : `grid ${standingsGridClass} border-b border-gray-700 last:border-b-0 p-2 text-xs sm:text-sm items-center`
                      }
                    >
                      <Link
                        href={`/teams?from=standings#${team.abbr}`}
                        className="flex items-center"
                      >
                        <Image
                          src={`/flags/${team.abbr}.png`}
                          alt={`${team.name} flag`}
                          width={24}
                          height={16}
                          className="object-cover"
                        />
                      </Link>

                      <Link
                        href={`/teams?from=standings#${team.abbr}`}
                        className="font-semibold truncate pr-2 hover:underline"
                      >
                        <span className="hidden sm:inline">{team.name}</span>
                        <span className="sm:hidden">{team.abbr}</span>
                      </Link>

                      <span className="text-center">{team.mp}</span>
                      <span className="text-center">{team.w}</span>
                      <span className="text-center">{team.d}</span>
                      <span className="text-center">{team.l}</span>
                      <span className="text-center font-bold">{team.pts}</span>

                      {groupExpanded && (
                        <>
                          <span className="text-center">{team.gf}</span>
                          <span className="text-center">{team.ga}</span>
                          <span className="text-center">{team.gd}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
                </div>
              );
            })}
        </div>
      </section>

      <TabBar />
    </main>
  );
}