import type { PostgrestError } from "@supabase/supabase-js";

// The database's own messages (raised by our functions and guards) are written
// for people; anything else gets the caller's fallback.
const OURS = ["P0001", "P0002", "22023", "23505"];

export function friendlyError(
  error: Pick<PostgrestError, "code" | "message"> | null,
  fallback: string,
): string {
  if (!error) return fallback;
  if (OURS.includes(error.code)) return error.message;
  if (
    error.code === "42501" &&
    !/row-level security|permission denied/i.test(error.message)
  )
    return error.message;
  if (error.code === "42501")
    return "You can't change this. Ask the CEO if you think you should be able to.";
  if (error.code === "23514") return "That value isn't allowed here.";
  return fallback;
}
