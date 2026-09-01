import { NextResponse } from "next/server";
import { groups as staticGroups } from "@/data/wc2026Data";

const API_FOOTBALL_URL =
  "https://v3.football.api-sports.io/standings?league=1&season=2026";

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getApiTeamAbbr(apiName) {
  const normalizedApiName = normalizeName(apiName);

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

  return apiNameMap[normalizedApiName] || null;
}

function buildStaticTeamLookup() {
  const lookup = {};

  staticGroups.forEach((group) => {
    group.teams.forEach((team) => {
      lookup[normalizeName(team.name)] = {
        abbr: team.abbr,
        name: team.name,
        flag: team.abbr,
      };

      lookup[normalizeName(team.abbr)] = {
        abbr: team.abbr,
        name: team.name,
        flag: team.abbr,
      };
    });
  });

  return lookup;
}

function buildFallbackStandings() {
  return staticGroups.map((group) => ({
    group: group.group,
    teams: group.teams.map((team, index) => ({
      rank: index + 1,
      abbr: team.abbr,
      name: team.name,
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

function addManualOrderAndSort(apiStandings) {
  function getPoints(team) {
    return Number(team.points ?? team.pts ?? 0);
  }

  function getGoalsFor(team) {
    return Number(team.goalsFor ?? team.gf ?? team.goals?.for ?? 0);
  }

  function getGoalsAgainst(team) {
    return Number(team.goalsAgainst ?? team.ga ?? team.goals?.against ?? 0);
  }

  function getGoalDifference(team) {
    const directGoalDifference =
      team.goalsDiff ??
      team.goalDifference ??
      team.gd ??
      team.goals?.diff;

    if (directGoalDifference !== undefined && directGoalDifference !== null) {
      return Number(directGoalDifference);
    }

    return getGoalsFor(team) - getGoalsAgainst(team);
  }

  function getMatchesPlayed(team) {
    return Number(team.played ?? team.mp ?? team.all?.played ?? 0);
  }

  function getManualOrder(team) {
    return Number(team.manualOrder ?? 0);
  }

  return apiStandings.map((groupData) => {
    return {
      ...groupData,
      teams: [...groupData.teams].sort((a, b) => {
        const pointsDifference = getPoints(b) - getPoints(a);

        if (pointsDifference !== 0) {
          return pointsDifference;
        }

        const goalDifferenceDifference =
          getGoalDifference(b) - getGoalDifference(a);

        if (goalDifferenceDifference !== 0) {
          return goalDifferenceDifference;
        }

        const goalsForDifference = getGoalsFor(b) - getGoalsFor(a);

        if (goalsForDifference !== 0) {
          return goalsForDifference;
        }

        const matchesPlayedDifference =
          getMatchesPlayed(a) - getMatchesPlayed(b);

        if (matchesPlayedDifference !== 0) {
          return matchesPlayedDifference;
        }

        return getManualOrder(a) - getManualOrder(b);
      }),
    };
  });
}

export async function GET(request) {
  try {
    if (!process.env.API_FOOTBALL_KEY) {
      try {
        const savedResponse = await fetch(
          `${request.nextUrl.origin}/api/archive/standings`,
          { cache: "no-store" }
        );

        const savedData = await savedResponse.json();

        if (savedData.ok && savedData.snapshot) {
          return NextResponse.json({
            ok: true,
            source: "archive",
            updatedAt: savedData.snapshot.updated_at,
            standings: savedData.snapshot.standings_json,
            warning: "Using saved standings because API-Football key is missing.",
          });
        }
      } catch (error) {
        console.error("Could not load archived standings:", error);
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Missing API_FOOTBALL_KEY in environment variables and no archived standings were found.",
          standings: buildFallbackStandings(),
        },
        { status: 500 }
      );
    }

    const response = await fetch(API_FOOTBALL_URL, {
      headers: {
        "x-apisports-key": process.env.API_FOOTBALL_KEY,
      },
      next: {
        revalidate: 60,
      },
    });

    const data = await response.json();

    if (
      !response.ok ||
      data.errors?.length ||
      Object.keys(data.errors || {}).length
    ) {
      try {
        const savedResponse = await fetch(
          `${request.nextUrl.origin}/api/archive/standings`,
          { cache: "no-store" }
        );

        const savedData = await savedResponse.json();

        if (savedData.ok && savedData.snapshot) {
          return NextResponse.json({
            ok: true,
            source: "archive",
            updatedAt: savedData.snapshot.updated_at,
            standings: savedData.snapshot.standings_json,
            warning: "Using saved standings because API-Football failed.",
          });
        }
      } catch (error) {
        console.error("Could not load archived standings:", error);
      }

      return NextResponse.json(
        {
          ok: false,
          error: "API-Football request failed.",
          details: data.errors,
          standings: buildFallbackStandings(),
        },
        { status: 502 }
      );
    }

    const staticTeamLookup = buildStaticTeamLookup();

    const apiStandings = data.response?.[0]?.league?.standings || [];

    function getApiGroupRows(staticGroup, groupIndex) {
        const targetGroupName = normalizeName(`Group ${staticGroup.group}`);

        const matchingGroup = apiStandings.find((groupTable) =>
            groupTable.some((row) => normalizeName(row.group) === targetGroupName)
        );

        return matchingGroup || apiStandings[groupIndex] || [];
    }   

    function findApiTeamRow(staticTeam, apiGroupRows) {
      return apiGroupRows.find((row) => {
        const mappedApiAbbr = getApiTeamAbbr(row.team?.name);

        if (mappedApiAbbr) {
          return mappedApiAbbr === staticTeam.abbr;
        }

        return (
          normalizeName(row.team?.name) === normalizeName(staticTeam.name) ||
          normalizeName(row.team?.name) === normalizeName(staticTeam.abbr)
        );
      });
    }

    const standings = staticGroups.map((staticGroup, groupIndex) => {
        const apiGroupRows = getApiGroupRows(staticGroup, groupIndex);

        const teams = staticGroup.teams.map((staticTeam, index) => {
            const apiRow = findApiTeamRow(staticTeam, apiGroupRows);

            return {
                rank: apiRow?.rank ?? index + 1,

                // Keep YOUR names/abbrs/flags
                abbr: staticTeam.abbr,
                name: staticTeam.name,

                // Use API stats only
                mp: apiRow?.all?.played ?? 0,
                w: apiRow?.all?.win ?? 0,
                d: apiRow?.all?.draw ?? 0,
                l: apiRow?.all?.lose ?? 0,
                gf: apiRow?.all?.goals?.for ?? 0,
                ga: apiRow?.all?.goals?.against ?? 0,
                gd: apiRow?.goalsDiff ?? 0,
                pts: apiRow?.points ?? 0,

                // Optional debugging
                apiTeamName: apiRow?.team?.name || null,
            };
        });

        const hasApiRows = apiGroupRows.length > 0;

        return {
          group: staticGroup.group,
          teams,
        };
    });

    const finalStandings = addManualOrderAndSort(
      standings.length > 0 ? standings : buildFallbackStandings()
    );

    try {
      const saveResponse = await fetch(
        `${request.nextUrl.origin}/api/archive/standings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            standings: finalStandings,
            source: "api-football",
          }),
        }
      );

      if (!saveResponse.ok) {
        console.error("Could not save standings snapshot.");
      }
    } catch (error) {
      console.error("Could not save standings snapshot:", error);
    }

    return NextResponse.json(
      {
        ok: true,
        source: "api-football",
        updatedAt: new Date().toISOString(),
        standings: finalStandings,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        standings: buildFallbackStandings(),
      },
      { status: 500 }
    );
  }
}