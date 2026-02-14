import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "key parameter is required" },
        { status: 400 }
      );
    }

    const value = await getSetting(key);
    return NextResponse.json({ value });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch setting" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key, value } = await request.json();

    if (!key || typeof value !== "string") {
      return NextResponse.json(
        { error: "key and value are required" },
        { status: 400 }
      );
    }

    await setSetting(key, value);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
