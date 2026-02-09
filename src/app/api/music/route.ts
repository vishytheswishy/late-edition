import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { getMusicData, saveMusicData, type MusicData } from "@/lib/music";

export async function GET() {
  try {
    const data = await getMusicData();
    return NextResponse.json(data);
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
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to save music data" },
      { status: 500 }
    );
  }
}
