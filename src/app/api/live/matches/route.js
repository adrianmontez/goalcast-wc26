import { NextResponse } from "next/server";
import { matches as staticMatches } from "@/data/wc2026Data";

const API_FOOTBALL_URL =
  "https://v3.football.api-sports.io/fixtures?league=1&season=2026";

function mapStatus(apiStatusShort) {
  if (["NS", "TBD"].includes(apiStatusShort)) return "scheduled";

  if (["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT"].includes(apiStatusShort)) {
    return "live";
  }

  if (["FT", "AET", "PEN"].includes(apiStatusShort)) return "finished";

  if (["PST", "CANC", "ABD"].includes(apiStatusShort)) return "postponed";

  return "scheduled";
}

function sortByApiDate(a, b) {
  return new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0);
}

export async function GET() {
  try {
    if (!process.env.API_FOOTBALL_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing API_FOOTBALL_KEY in environment variables.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(API_FOOTBALL_URL, {
      headers: {
        "x-apisports-key": process.env.API_FOOTBALL_KEY,
      },
      next: {
        revalidate: 30,
      },
    });

    const data = await response.json();

    if (!response.ok || data.errors?.length || Object.keys(data.errors || {}).length) {
      return NextResponse.json(
        {
          ok: false,
          error: "API-Football request failed.",
          details: data.errors,
          matches: staticMatches,
        },
        { status: 502 }
      );
    }

    const apiFixtures = data.response || [];

    const groupStageFixtures = apiFixtures
      .filter((fixture) =>
        String(fixture.league?.round || "")
          .toLowerCase()
          .includes("group")
      )
      .sort(sortByApiDate);

    const mergedMatches = staticMatches.map((match, index) => {
      const apiFixture = groupStageFixtures[index];

      if (!apiFixture) {
        return match;
      }

      return {
        ...match,

        stadium: match.stadium,

        apiFixtureId: apiFixture.fixture?.id || null,

        status: mapStatus(apiFixture.fixture?.status?.short),
        apiStatusShort: apiFixture.fixture?.status?.short || null,
        apiStatusLong: apiFixture.fixture?.status?.long || null,
        elapsed: apiFixture.fixture?.status?.elapsed ?? null,
        extra: apiFixture.fixture?.status?.extra ?? null,

        homeScore: apiFixture.goals?.home ?? null,
        awayScore: apiFixture.goals?.away ?? null,

        apiHomeName: apiFixture.teams?.home?.name || null,
        apiAwayName: apiFixture.teams?.away?.name || null,

        apiDate: apiFixture.fixture?.date || null,
        apiVenue: apiFixture.fixture?.venue?.name || null,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        source: "api-football",
        updatedAt: new Date().toISOString(),
        totalApiFixtures: apiFixtures.length,
        totalGroupStageFixtures: groupStageFixtures.length,
        matches: mergedMatches,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        matches: staticMatches,
      },
      { status: 500 }
    );
  }
}