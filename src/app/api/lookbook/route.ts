import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getLookbookData,
  saveLookbookData,
  type LookbookData,
} from "@/lib/lookbook";

export async function GET(request: Request) {
  try {
    const data = await getLookbookData();
    const { searchParams } = new URL(request.url);
    const noCache = searchParams.has("fresh");

    return NextResponse.json(data, {
      headers: noCache
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch lookbook data" },
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
    const data = (await request.json()) as LookbookData;

    if (!data.images) {
      return NextResponse.json(
        { error: "images array is required" },
        { status: 400 }
      );
    }

    await saveLookbookData(data);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to save lookbook data" },
      { status: 500 }
    );
  }
}
