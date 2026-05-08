import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { data, error } = await supabase
    .from("match_votes")
    .select("match_id, pick");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = {};

  data.forEach((vote) => {
    if (!counts[vote.match_id]) {
      counts[vote.match_id] = {};
    }

    counts[vote.match_id][vote.pick] =
      (counts[vote.match_id][vote.pick] || 0) + 1;
  });

  return NextResponse.json({ counts });
}

export async function POST(request) {
  const { matchId, pick, voterId } = await request.json();

  if (!matchId || !pick || !voterId) {
    return NextResponse.json(
      { error: "Missing matchId, pick, or voterId" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("match_votes").upsert(
    {
      match_id: matchId,
      pick,
      voter_id: voterId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "match_id,voter_id",
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const { matchId, voterId } = await request.json();

  if (!matchId || !voterId) {
    return NextResponse.json(
      { error: "Missing matchId or voterId" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("match_votes")
    .delete()
    .eq("match_id", matchId)
    .eq("voter_id", voterId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}