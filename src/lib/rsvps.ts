import { db } from "@/lib/db";
import { rsvps } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export interface Rsvp {
  id: number;
  eventId: string;
  name: string;
  email: string;
  status: string;
  plusOne: number;
  note: string;
  createdAt: string;
}

export async function rsvpToEvent(
  eventId: string,
  data: { name: string; email: string; status?: string; plusOne?: number; note?: string }
): Promise<Rsvp> {
  const rows = await db
    .insert(rsvps)
    .values({
      eventId,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      status: data.status || "going",
      plusOne: data.plusOne ?? 0,
      note: data.note || "",
    })
    .onConflictDoUpdate({
      target: [rsvps.eventId, rsvps.email],
      set: {
        name: data.name,
        status: data.status || "going",
        plusOne: data.plusOne ?? 0,
        note: data.note || "",
      },
    })
    .returning();

  const r = rows[0];
  return { ...r, createdAt: r.createdAt.toISOString() };
}

export async function getEventRsvps(eventId: string): Promise<Rsvp[]> {
  const rows = await db
    .select()
    .from(rsvps)
    .where(eq(rsvps.eventId, eventId));

  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getRsvpByEmail(
  eventId: string,
  email: string
): Promise<Rsvp | null> {
  const rows = await db
    .select()
    .from(rsvps)
    .where(
      and(eq(rsvps.eventId, eventId), eq(rsvps.email, email.toLowerCase().trim()))
    );

  if (rows.length === 0) return null;
  const r = rows[0];
  return { ...r, createdAt: r.createdAt.toISOString() };
}

export async function deleteRsvp(id: number): Promise<void> {
  await db.delete(rsvps).where(eq(rsvps.id, id));
}

export async function getRsvpCount(eventId: string): Promise<number> {
  const result = await db
    .select({
      total: sql<number>`count(*) + coalesce(sum(${rsvps.plusOne}), 0)`,
    })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "going")));

  return Number(result[0]?.total ?? 0);
}
