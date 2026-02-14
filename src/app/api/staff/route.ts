import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { generateId } from "@/lib/utils";
import {
  getStaffMembers,
  saveStaffMember,
  type StaffMember,
} from "@/lib/staff";

export async function GET(request: Request) {
  try {
    const members = await getStaffMembers();
    const { searchParams } = new URL(request.url);
    const noCache = searchParams.has("fresh");
    return NextResponse.json(members, {
      headers: noCache
        ? { "Cache-Control": "no-store" }
        : { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch staff members" },
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
    const { name, role, bio, coverImage, photos, order } =
      await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = new Date().toISOString();
    const photoList = Array.isArray(photos) ? photos : [];

    const member: StaffMember = {
      id,
      name,
      role: role || "",
      bio: bio || "",
      coverImage: coverImage || "",
      order: typeof order === "number" ? order : 0,
      photos: photoList,
      createdAt: now,
      updatedAt: now,
    };

    await saveStaffMember(member);

    return NextResponse.json(member, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}
