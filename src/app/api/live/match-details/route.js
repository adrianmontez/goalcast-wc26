import { NextResponse } from "next/server";

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
      return NextResponse.json(
        { ok: false, error: "Missing API_FOOTBALL_KEY." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY,
        },
        next: {
          revalidate: 15,
        },
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      data.errors?.length ||
      Object.keys(data.errors || {}).length
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "API-Football match events request failed.",
          details: data.errors,
          events: [],
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        updatedAt: new Date().toISOString(),
        events: data.response || [],
      },
      {
        headers: {
          "Cache-Control": "s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message, events: [] },
      { status: 500 }
    );
  }
}