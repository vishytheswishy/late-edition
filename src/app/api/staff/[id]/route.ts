import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import {
  getStaffMember,
  saveStaffMember,
  deleteStaffMember,
} from "@/lib/staff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const member = await getStaffMember(id);
    if (!member) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    return NextResponse.json(member);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch staff member" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await getStaffMember(id);
    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const { name, role, bio, coverImage, photos, order } =
      await request.json();

    const updated = {
      ...existing,
      name: name ?? existing.name,
      role: role ?? existing.role,
      bio: bio ?? existing.bio,
      coverImage: coverImage ?? existing.coverImage,
      order: typeof order === "number" ? order : existing.order,
      photos: photos ?? existing.photos,
      updatedAt: new Date().toISOString(),
    };

    await saveStaffMember(updated);

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update staff member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteStaffMember(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete staff member" },
      { status: 500 }
    );
  }
}
