// Loads the sample accounts and clients onto a hosted Supabase project.
// Same people and clients as supabase/seed.sql (keep the two in step), but the
// password comes from SEED_PASSWORD in the env file, never from the repo.
//
//   npm run seed:sample -- --env .env.hosted.local
//
// Safe to run twice: existing rows are left as they are.
import { loadScriptEnv, need, serviceClient } from "./env";

const STAFF = [
  { email: "ceo@example.com", name: "Sample CEO", role: "ceo" },
  {
    email: "ae.one@example.com",
    name: "Sample Account Exec One",
    role: "account_exec",
  },
  {
    email: "ae.two@example.com",
    name: "Sample Account Exec Two",
    role: "account_exec",
  },
  {
    email: "creative.director@example.com",
    name: "Sample Creative Director",
    role: "creative_director",
  },
  { email: "designer@example.com", name: "Sample Designer", role: "designer" },
] as const;

const CLIENTS = [
  {
    code: "MM-SCC-1001",
    name: "Sample Coffee Co",
    industry: "Food and drink",
    status: "active",
    ae: "ae.one@example.com",
    start: "2026-09-01",
    contact: "Sample Coffee Contact",
    contactRole: "Owner",
    email: "client.coffee@example.com",
    phone: "+267 7100 0001",
    platforms: ["facebook", "instagram"],
    goal: "visibility",
  },
  {
    code: "MM-DFS-1002",
    name: "Demo Fitness Studio",
    industry: "Health and fitness",
    status: "onboarding",
    ae: "ae.one@example.com",
    start: null,
    contact: "Demo Fitness Contact",
    contactRole: "Manager",
    email: "demo.fitness@example.com",
    phone: "+267 7100 0002",
    platforms: ["instagram", "facebook"],
    goal: "engagement",
  },
  {
    code: "MM-EAP-1003",
    name: "Example Auto Parts",
    industry: "Retail",
    status: "active",
    ae: "ae.two@example.com",
    start: "2026-08-01",
    contact: "Example Auto Contact",
    contactRole: "Marketing lead",
    email: "example.auto@example.com",
    phone: "+267 7100 0003",
    platforms: ["facebook", "instagram"],
    goal: "results",
  },
] as const;

const CLIENT_LOGIN = {
  email: "client.coffee@example.com",
  name: "Sample Coffee Contact",
  clientCode: "MM-SCC-1001",
};

async function main() {
  const file = loadScriptEnv();
  const password = need("SEED_PASSWORD");
  if (password.length < 10)
    throw new Error("SEED_PASSWORD must be at least 10 characters.");
  const db = serviceClient();
  console.log(
    `Seeding sample data using ${file} (${need("NEXT_PUBLIC_SUPABASE_URL")})`,
  );

  const { data: list, error: listError } = await db.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listError) throw listError;
  const byEmail = new Map(list.users.map((u) => [u.email, u.id]));

  async function ensureUser(email: string, name: string) {
    const existing = byEmail.get(email);
    if (existing) return existing;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw error;
    byEmail.set(email, data.user.id);
    return data.user.id;
  }

  const staffIds = new Map<string, string>();
  for (const s of STAFF) {
    const id = await ensureUser(s.email, s.name);
    staffIds.set(s.email, id);
    const { error } = await db
      .from("profiles")
      .upsert(
        { id, full_name: s.name, email: s.email, role: s.role },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error) throw error;
    console.log(`  staff   ${s.email}`);
  }

  const { data: service, error: serviceError } = await db
    .from("services")
    .select("id, price")
    .eq("name", "Brand Launch")
    .single();
  if (serviceError) throw serviceError;

  for (const c of CLIENTS) {
    const { error } = await db.from("clients").upsert(
      {
        name: c.name,
        client_code: c.code,
        industry: c.industry,
        status: c.status,
        account_exec_id: staffIds.get(c.ae),
        service_id: service.id,
        monthly_fee: service.price,
        start_date: c.start,
        contact_name: c.contact,
        contact_role: c.contactRole,
        contact_email: c.email,
        contact_phone: c.phone,
        platforms: [...c.platforms],
        main_goal: c.goal,
        notes: "Sample client. Not a real business.",
      },
      { onConflict: "client_code", ignoreDuplicates: true },
    );
    if (error) throw error;
    console.log(`  client  ${c.code} ${c.name}`);
  }

  const { data: client, error: clientError } = await db
    .from("clients")
    .select("id")
    .eq("client_code", CLIENT_LOGIN.clientCode)
    .single();
  if (clientError) throw clientError;
  const userId = await ensureUser(CLIENT_LOGIN.email, CLIENT_LOGIN.name);
  const { error: loginError } = await db
    .from("client_users")
    .upsert(
      {
        user_id: userId,
        client_id: client.id,
        full_name: CLIENT_LOGIN.name,
        email: CLIENT_LOGIN.email,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (loginError) throw loginError;
  console.log(`  login   ${CLIENT_LOGIN.clientCode} (${CLIENT_LOGIN.email})`);
  console.log(
    "Done. Every sample account uses the SEED_PASSWORD from your env file.",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
