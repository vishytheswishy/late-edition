import { db } from "@/lib/db";
import { staffMembers, staffMemberPhotos } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export interface StaffPhoto {
  url: string;
  caption: string;
}

export interface StaffMemberMeta {
  id: string;
  name: string;
  role: string;
  bio: string;
  coverImage: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember extends StaffMemberMeta {
  photos: StaffPhoto[];
}

/**
 * Get all staff members with their photos, ordered by display_order.
 */
export async function getStaffMembers(): Promise<StaffMember[]> {
  try {
    const memberRows = await db
      .select()
      .from(staffMembers)
      .orderBy(asc(staffMembers.order));

    const photoRows = await db
      .select()
      .from(staffMemberPhotos)
      .orderBy(asc(staffMemberPhotos.order));

    const photosByMember = new Map<string, StaffPhoto[]>();
    for (const p of photoRows) {
      const list = photosByMember.get(p.memberId) || [];
      list.push({ url: p.url, caption: p.caption });
      photosByMember.set(p.memberId, list);
    }

    return memberRows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      bio: r.bio,
      coverImage: r.coverImage,
      order: r.order,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      photos: photosByMember.get(r.id) || [],
    }));
  } catch {
    return [];
  }
}

/**
 * Get a staff member index (without photos) for the admin list.
 */
export async function getStaffIndex(): Promise<StaffMemberMeta[]> {
  try {
    const rows = await db
      .select()
      .from(staffMembers)
      .orderBy(asc(staffMembers.order));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      bio: r.bio,
      coverImage: r.coverImage,
      order: r.order,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Get a single staff member by ID with photos.
 */
export async function getStaffMember(id: string): Promise<StaffMember | null> {
  try {
    const memberRows = await db
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.id, id));
    if (memberRows.length === 0) return null;

    const r = memberRows[0];
    const photoRows = await db
      .select({ url: staffMemberPhotos.url, caption: staffMemberPhotos.caption })
      .from(staffMemberPhotos)
      .where(eq(staffMemberPhotos.memberId, id))
      .orderBy(asc(staffMemberPhotos.order));

    return {
      id: r.id,
      name: r.name,
      role: r.role,
      bio: r.bio,
      coverImage: r.coverImage,
      order: r.order,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      photos: photoRows,
    };
  } catch {
    return null;
  }
}

/**
 * Create or update a staff member and their photos (upsert).
 */
export async function saveStaffMember(member: StaffMember): Promise<void> {
  await db
    .insert(staffMembers)
    .values({
      id: member.id,
      name: member.name,
      role: member.role,
      bio: member.bio,
      coverImage: member.coverImage,
      order: member.order,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.updatedAt),
    })
    .onConflictDoUpdate({
      target: staffMembers.id,
      set: {
        name: member.name,
        role: member.role,
        bio: member.bio,
        coverImage: member.coverImage,
        order: member.order,
        updatedAt: new Date(member.updatedAt),
      },
    });

  // Replace photos: delete existing, then insert new ones
  await db.delete(staffMemberPhotos).where(eq(staffMemberPhotos.memberId, member.id));

  if (member.photos.length > 0) {
    await db.insert(staffMemberPhotos).values(
      member.photos.map((photo, i) => ({
        memberId: member.id,
        url: photo.url,
        caption: photo.caption,
        order: i,
      }))
    );
  }
}

/**
 * Delete a staff member and all their photos.
 */
export async function deleteStaffMember(id: string): Promise<void> {
  await db.delete(staffMemberPhotos).where(eq(staffMemberPhotos.memberId, id));
  await db.delete(staffMembers).where(eq(staffMembers.id, id));
}
