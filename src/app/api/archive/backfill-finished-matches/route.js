import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { groups, matches as staticMatches } from "@/data/wc2026Data";

const API_FIXTURES_URL =
  "https://v3.football.api-sports.io/fixtures?league=1&season=2026";

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
    czechia: "CZE",

    "south korea": "KOR",
    "korea republic": "KOR",
    "republic of korea": "KOR",

    usa: "USA",
    "united states": "USA",
    "united states of america": "USA",

    curacao: "CUW",
    "curaçao": "CUW",
    "curacao national team": "CUW",
    "curaçao national team": "CUW",

    bosnia: "BIH",
    "bosnia and herzegovina": "BIH",
    "bosnia & herzegovina": "BIH",
    "bosnia-herzegovina": "BIH",

    turkiye: "TUR",
    turkey: "TUR",
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
  };

  return apiNameMap[normalizedApiName] || null;
}

function getApiFixtureTeamAbbr(apiTeamName, staticTeams) {
  const mappedAbbr = getApiTeamAbbr(apiTeamName);

  if (mappedAbbr) return mappedAbbr;

  const apiName = normalizeName(apiTeamName);

  const matchingTeam = staticTeams.find(
    (team) =>
      normalizeName(team.name) === apiName ||
      normalizeName(team.abbr) === apiName
  );

  return matchingTeam?.abbr || null;
}

function findStaticMatchForApiFixture(apiFixture, staticTeams) {
  const apiHomeAbbr = getApiFixtureTeamAbbr(
    apiFixture.teams?.home?.name,
    staticTeams
  );

  const apiAwayAbbr = getApiFixtureTeamAbbr(
    apiFixture.teams?.away?.name,
    staticTeams
  );

  if (!apiHomeAbbr || !apiAwayAbbr) return null;

  return staticMatches.find(
    (match) => match.home === apiHomeAbbr && match.away === apiAwayAbbr
  );
}

async function fetchFromApiFootball(url) {
  const response = await fetch(url, {
    headers: {
      "x-apisports-key": process.env.API_FOOTBALL_KEY,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || Object.keys(data.errors || {}).length) {
    throw new Error(
      `API-Football request failed: ${JSON.stringify(data.errors)}`
    );
  }

  return data;
}

export async function POST() {
  try {
    if (!process.env.API_FOOTBALL_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing API_FOOTBALL_KEY." },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();
    const staticTeams = groups.flatMap((group) => group.teams);

    const fixturesData = await fetchFromApiFootball(API_FIXTURES_URL);
    const apiFixtures = fixturesData.response || [];

    const finishedFixtures = apiFixtures.filter((fixture) =>
      ["FT", "AET", "PEN"].includes(fixture.fixture?.status?.short)
    );

    const saved = [];
    const skipped = [];

    for (const apiFixture of finishedFixtures) {
      const staticMatch = findStaticMatchForApiFixture(apiFixture, staticTeams);

      if (!staticMatch) {
        skipped.push({
          apiFixtureId: apiFixture.fixture?.id,
          reason: "Could not match API fixture to static match.",
          apiHomeName: apiFixture.teams?.home?.name,
          apiAwayName: apiFixture.teams?.away?.name,
        });
        continue;
      }

      const fixtureId = apiFixture.fixture?.id;

      const eventsData = await fetchFromApiFootball(
        `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`
      );

      const events = eventsData.response || [];

      const { error } = await supabase
        .from("finished_match_snapshots")
        .upsert(
          {
            api_fixture_id: Number(fixtureId),
            match_id: String(staticMatch.id),
            home: staticMatch.home,
            away: staticMatch.away,
            home_score: apiFixture.goals?.home ?? null,
            away_score: apiFixture.goals?.away ?? null,
            api_status_short: apiFixture.fixture?.status?.short || null,
            api_status_long: apiFixture.fixture?.status?.long || null,
            fixture_json: apiFixture,
            events_json: events,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "api_fixture_id" }
        );

      if (error) {
        skipped.push({
          apiFixtureId: fixtureId,
          reason: error.message,
          apiHomeName: apiFixture.teams?.home?.name,
          apiAwayName: apiFixture.teams?.away?.name,
        });
        continue;
      }

      saved.push({
        apiFixtureId: fixtureId,
        matchId: staticMatch.id,
        home: staticMatch.home,
        away: staticMatch.away,
        score: `${apiFixture.goals?.home ?? 0}-${apiFixture.goals?.away ?? 0}`,
      });
    }

    return NextResponse.json({
      ok: true,
      finishedFixturesFound: finishedFixtures.length,
      savedCount: saved.length,
      skippedCount: skipped.length,
      saved,
      skipped,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}