import { redirect } from "next/navigation";
import { homeFor, STAFF_LOGIN } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.role) : STAFF_LOGIN);
}
