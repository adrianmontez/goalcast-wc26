import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      matchId,
      apiFixtureId,
      home,
      away,
      homeScore,
      awayScore,
      apiStatusShort,
      apiStatusLong,
      fixture,
      events,
    } = body;

    if (!apiFixtureId) {
      return NextResponse.json(
        { ok: false, error: "Missing apiFixtureId." },
        { status: 400 }
      );
    }

    const finishedStatuses = ["FT", "AET", "PEN"];

    if (!finishedStatuses.includes(apiStatusShort)) {
      return NextResponse.json(
        { ok: false, error: "Match is not finished yet." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("finished_match_snapshots")
      .upsert(
        {
          api_fixture_id: Number(apiFixtureId),
          match_id: String(matchId),
          home,
          away,
          home_score: homeScore,
          away_score: awayScore,
          api_status_short: apiStatusShort,
          api_status_long: apiStatusLong,
          fixture_json: fixture || null,
          events_json: events || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "api_fixture_id" }
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, saved: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}