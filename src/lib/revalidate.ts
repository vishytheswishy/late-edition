import { revalidatePath } from "next/cache";

// Centralised cache busting so an admin save shows up on the public site
// without waiting for the ISR window to elapse.

export function revalidateArticles(slug?: string) {
  revalidatePath("/");
  revalidatePath("/articles");
  if (slug) revalidatePath(`/articles/${slug}`);
}

export function revalidateEvents(slug?: string) {
  revalidatePath("/");
  revalidatePath("/events");
  if (slug) revalidatePath(`/events/${slug}`);
}

export function revalidateAlbums() {
  revalidatePath("/photos");
}

export function revalidateStaff() {
  revalidatePath("/about");
}

export function revalidateLookbook() {
  revalidatePath("/");
}

export function revalidateMusic() {
  revalidatePath("/music");
}

export function revalidateSettings() {
  // Settings can be referenced from anywhere — bust the layout-shaped surfaces.
  revalidatePath("/", "layout");
}
