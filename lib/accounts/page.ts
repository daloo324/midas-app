import "server-only";
import { notFound } from "next/navigation";
import { monthStart } from "@/lib/content/constants";
import { getDeskClient } from "@/lib/data/accounts";
import { todayInGaborone } from "@/lib/format";
import { uuid } from "@/lib/validation/accounts";

/** The month in ?month=YYYY-MM, or this month in Gaborone. */
export function resolveMonth(param: string | string[] | undefined): string {
  return (
    monthStart(typeof param === "string" ? param : null) ??
    `${todayInGaborone().slice(0, 7)}-01`
  );
}

/** The client, if this person can see them (RLS decides); otherwise a 404. */
export async function clientOr404(id: string) {
  if (!uuid.safeParse(id).success) notFound();
  const client = await getDeskClient(id);
  if (!client) notFound();
  return client;
}
