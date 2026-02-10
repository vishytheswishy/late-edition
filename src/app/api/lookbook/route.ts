import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getLookbookData,
  saveLookbookData,
  uploadLookbookImage,
  deleteLookbookImage,
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

export async function PUT(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }

    const url = await uploadLookbookImage(file);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload lookbook image" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    await deleteLookbookImage(url);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete lookbook image" },
      { status: 500 }
    );
  }
}
