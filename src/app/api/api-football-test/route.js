import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://v3.football.api-sports.io/fixtures?league=1&season=2026",
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY,
        },
      }
    );

    const data = await response.json();

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      results: data.results,
      sample: data.response?.slice(0, 3),
      errors: data.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}