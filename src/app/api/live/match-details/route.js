import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

async function getArchivedMatchDetails(fixtureId) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("finished_match_snapshots")
    .select("*")
    .eq("api_fixture_id", Number(fixtureId))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    fixture:
      data.fixture_json?.apiFixture ||
      data.fixture_json?.fixture ||
      data.fixture_json ||
      null,
    events: data.events_json || [],
    updatedAt: data.updated_at,
    source: "archive",
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fixtureId = searchParams.get("fixture");

    if (!fixtureId) {
      return NextResponse.json(
        { ok: false, error: "Missing fixture ID." },
        { status: 400 }
      );
    }

    if (!process.env.API_FOOTBALL_KEY) {
      const archivedDetails = await getArchivedMatchDetails(fixtureId);

      if (archivedDetails) {
        return NextResponse.json({
          ok: true,
          ...archivedDetails,
          warning: "Using saved match details because API-Football key is missing.",
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Missing API_FOOTBALL_KEY and no archived match details were found.",
          fixture: null,
          events: [],
        },
        { status: 500 }
      );
    }

    const [fixtureResponse, eventsResponse] = await Promise.all([
      fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY,
        },
        next: {
          revalidate: 30,
        },
      }),

      fetch(
        `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
        {
          headers: {
            "x-apisports-key": process.env.API_FOOTBALL_KEY,
          },
          next: {
            revalidate: 30,
          },
        }
      ),
    ]);

    const fixtureData = await fixtureResponse.json();
    const eventsData = await eventsResponse.json();

    const fixtureErrors =
      fixtureData.errors && Object.keys(fixtureData.errors).length > 0;

    const eventsErrors =
      eventsData.errors && Object.keys(eventsData.errors).length > 0;

    if (!fixtureResponse.ok || fixtureErrors) {
      const archivedDetails = await getArchivedMatchDetails(fixtureId);

      if (archivedDetails) {
        return NextResponse.json({
          ok: true,
          ...archivedDetails,
          warning: "Using saved match details because API-Football failed.",
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: "API-Football fixture request failed.",
          details: fixtureData.errors,
          fixture: null,
          events: [],
        },
        { status: 502 }
      );
    }

    const fixture = fixtureData.response?.[0] || null;

    return NextResponse.json(
      {
        ok: true,
        updatedAt: new Date().toISOString(),
        fixture,
        events: eventsResponse.ok && !eventsErrors ? eventsData.response || [] : [],
      },
      {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    try {
      const { searchParams } = new URL(request.url);
      const fixtureId = searchParams.get("fixture");

      if (fixtureId) {
        const archivedDetails = await getArchivedMatchDetails(fixtureId);

        if (archivedDetails) {
          return NextResponse.json({
            ok: true,
            ...archivedDetails,
            warning: "Using saved match details because API-Football is unavailable.",
          });
        }
      }
    } catch (archiveError) {
      console.error("Could not load archived match details:", archiveError);
    }

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        fixture: null,
        events: [],
      },
      { status: 500 }
    );
  }
}