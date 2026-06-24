import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const SNAPSHOT_KEY = "wc2026_current";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("standings_snapshots")
      .select("*")
      .eq("snapshot_key", SNAPSHOT_KEY)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      snapshot: data || null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { standings, source } = body;

    if (!standings) {
      return NextResponse.json(
        { ok: false, error: "Missing standings." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("standings_snapshots")
      .upsert(
        {
          snapshot_key: SNAPSHOT_KEY,
          standings_json: standings,
          source: source || "api-football",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "snapshot_key" }
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      saved: true,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}