// Demo mode: dummy logins and in-memory sample data, so the app can be clicked
// through without a Supabase project. Switched on with DEMO_MODE=1, and never
// on Vercel's production deployment.

export const DEMO_PASSWORD = "midas-demo-2026";
export const DEMO_COOKIE = "midas_demo_user";

export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === "1" && process.env.VERCEL_ENV !== "production"
  );
}
