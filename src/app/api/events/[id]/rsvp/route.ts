import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { getEvent } from "@/lib/events";
import {
  rsvpToEvent,
  getEventRsvps,
  deleteRsvp,
  getRsvpCount,
} from "@/lib/rsvps";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getEvent(id);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.rsvpEnabled) {
      return NextResponse.json(
        { error: "RSVP is not enabled for this event" },
        { status: 403 }
      );
    }

    const { name, email, status, plusOne, note } = await request.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const validStatuses = ["going", "maybe", "not_going"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be going, maybe, or not_going" },
        { status: 400 }
      );
    }

    const rsvp = await rsvpToEvent(id, {
      name: name.trim(),
      email: email.trim(),
      status: status || "going",
      plusOne: Math.max(0, Math.min(10, Number(plusOne) || 0)),
      note: (note || "").trim().slice(0, 500),
    });

    return NextResponse.json(rsvp, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to submit RSVP" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const [rsvpList, count] = await Promise.all([
      getEventRsvps(id),
      getRsvpCount(id),
    ]);

    return NextResponse.json({
      rsvps: rsvpList,
      totalHeadcount: count,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch RSVPs" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await params; // consume params
    const { rsvpId } = await request.json();

    if (!rsvpId) {
      return NextResponse.json(
        { error: "rsvpId is required" },
        { status: 400 }
      );
    }

    await deleteRsvp(Number(rsvpId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete RSVP" },
      { status: 500 }
    );
  }
}
