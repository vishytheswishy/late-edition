import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { getMusicData, saveMusicData, type MusicData } from "@/lib/music";
import { revalidateMusic } from "@/lib/revalidate";

export async function GET(request: Request) {
  try {
    const data = await getMusicData();
    const { searchParams } = new URL(request.url);
    const noCache = searchParams.has("fresh");
    return NextResponse.json(data, {
      headers: noCache
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch music data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = (await request.json()) as MusicData;

    if (!data.mixes || !data.staffPicks) {
      return NextResponse.json(
        { error: "mixes and staffPicks arrays are required" },
        { status: 400 }
      );
    }

    await saveMusicData(data);
    revalidateMusic();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to save music data" },
      { status: 500 }
    );
  }
}
