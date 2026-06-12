import { NextResponse } from "next/server";
import { groups as staticGroups } from "@/data/wc2026Data";

const API_FOOTBALL_URL =
  "https://v3.football.api-sports.io/standings?league=1&season=2026";

function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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

export async function GET() {
  try {
    if (!process.env.API_FOOTBALL_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing API_FOOTBALL_KEY in environment variables.",
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
      return NextResponse.json(
        {
          ok: false,
          error: "API-Football standings request failed.",
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

    const teamNameAliases = {
        USA: ["United States", "United States of America", "USA"],
        IRN: ["Iran", "IR Iran"],
        KOR: ["South Korea", "Korea Republic"],
        CIV: ["Ivory Coast", "Côte d'Ivoire", "Cote d'Ivoire"],
        COD: ["DR Congo", "Congo DR"],
    };

    function findApiTeamRow(staticTeam, apiGroupRows) {
        const possibleNames = [
            staticTeam.name,
            staticTeam.abbr,
            ...(teamNameAliases[staticTeam.abbr] || []),
        ].map(normalizeName);

        return apiGroupRows.find((row) => {
            const apiTeamName = normalizeName(row.team?.name);
            return possibleNames.includes(apiTeamName);
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
            teams: hasApiRows ? [...teams].sort((a, b) => a.rank - b.rank) : teams,
        };
    });

    return NextResponse.json(
      {
        ok: true,
        source: "api-football",
        updatedAt: new Date().toISOString(),
        standings: addManualOrderAndSort(
          standings.length > 0 ? standings : buildFallbackStandings()
        ),
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