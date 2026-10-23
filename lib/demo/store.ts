import "server-only";
import { newClientCode } from "@/lib/clients/code";
import type { StaffRole } from "@/lib/auth/routes";
import type { ClientStatus } from "@/lib/format/status";

// In-memory sample data for demo mode. It mirrors supabase/seed.sql and lives
// only as long as the server process: on Vercel, changes reset now and then.

export type DemoStaff = {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  pending: boolean;
};

export type DemoClient = {
  id: string;
  name: string;
  client_code: string;
  industry: string | null;
  status: ClientStatus;
  account_exec_id: string | null;
  service_id: string | null;
  monthly_fee: number | null;
  start_date: string | null;
  end_date: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  decision_maker: string | null;
  platforms: string[];
  notes: string | null;
  created_at: string;
};

export type DemoLogin = {
  id: string;
  user_id: string;
  client_id: string;
  full_name: string;
  email: string;
  login_id: string;
  is_primary: boolean;
  active: boolean;
  created_at: string;
};

export type DemoService = {
  id: string;
  name: string;
  price: number;
  unit: "monthly";
  active: boolean;
};

type Store = {
  staff: DemoStaff[];
  clients: DemoClient[];
  logins: DemoLogin[];
  services: DemoService[];
  maxActiveClients: number;
  attempts: Map<string, { at: number; ok: boolean }[]>;
};

const BRAND_LAUNCH = "30000000-0000-4000-8000-000000000001";
const AE1 = "10000000-0000-4000-8000-000000000002";
const AE2 = "10000000-0000-4000-8000-000000000003";
const NOTE = "Sample client. Not a real business.";

function client(
  c: Partial<DemoClient> &
    Pick<DemoClient, "id" | "name" | "client_code" | "status">,
): DemoClient {
  return {
    industry: null,
    account_exec_id: null,
    service_id: BRAND_LAUNCH,
    monthly_fee: 3250,
    start_date: null,
    end_date: null,
    contact_name: null,
    contact_role: null,
    contact_email: null,
    contact_phone: null,
    decision_maker: null,
    platforms: ["facebook", "instagram"],
    notes: NOTE,
    created_at: "2026-10-01T08:00:00Z",
    ...c,
  };
}

function seed(): Store {
  return {
    staff: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        full_name: "Sample CEO",
        email: "ceo@example.com",
        role: "ceo",
        active: true,
        pending: false,
      },
      {
        id: AE1,
        full_name: "Sample Account Exec One",
        email: "ae.one@example.com",
        role: "account_exec",
        active: true,
        pending: false,
      },
      {
        id: AE2,
        full_name: "Sample Account Exec Two",
        email: "ae.two@example.com",
        role: "account_exec",
        active: true,
        pending: false,
      },
      {
        id: "10000000-0000-4000-8000-000000000004",
        full_name: "Sample Creative Director",
        email: "creative.director@example.com",
        role: "creative_director",
        active: true,
        pending: false,
      },
      {
        id: "10000000-0000-4000-8000-000000000005",
        full_name: "Sample Designer",
        email: "designer@example.com",
        role: "designer",
        active: true,
        pending: false,
      },
    ],
    clients: [
      client({
        id: "20000000-0000-4000-8000-000000000001",
        name: "Sample Coffee Co",
        client_code: "MM-SCC-1001",
        industry: "Food and drink",
        status: "active",
        account_exec_id: AE1,
        start_date: "2026-09-01",
        contact_name: "Sample Coffee Contact",
        contact_role: "Owner",
        contact_email: "client.coffee@example.com",
        contact_phone: "+267 7100 0001",
      }),
      client({
        id: "20000000-0000-4000-8000-000000000002",
        name: "Demo Fitness Studio",
        client_code: "MM-DFS-1002",
        industry: "Health and fitness",
        status: "onboarding",
        account_exec_id: AE1,
        contact_name: "Demo Fitness Contact",
        contact_role: "Manager",
        contact_email: "demo.fitness@example.com",
        contact_phone: "+267 7100 0002",
        platforms: ["instagram", "facebook"],
      }),
      client({
        id: "20000000-0000-4000-8000-000000000003",
        name: "Example Auto Parts",
        client_code: "MM-EAP-1003",
        industry: "Retail",
        status: "active",
        account_exec_id: AE2,
        start_date: "2026-08-01",
        contact_name: "Example Auto Contact",
        contact_role: "Marketing lead",
        contact_email: "example.auto@example.com",
        contact_phone: "+267 7100 0003",
      }),
    ],
    logins: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        user_id: "10000000-0000-4000-8000-000000000101",
        client_id: "20000000-0000-4000-8000-000000000001",
        full_name: "Sample Coffee Contact",
        email: "client.coffee@example.com",
        login_id: "MM-SCC-1001",
        is_primary: true,
        active: true,
        created_at: "2026-10-01T08:00:00Z",
      },
    ],
    services: [
      {
        id: BRAND_LAUNCH,
        name: "Brand Launch",
        price: 3250,
        unit: "monthly",
        active: true,
      },
    ],
    maxActiveClients: 10,
    attempts: new Map(),
  };
}

const holder = globalThis as unknown as { __midasDemo?: Store };

export function store(): Store {
  holder.__midasDemo ??= seed();
  return holder.__midasDemo;
}

export function resetDemoStore() {
  holder.__midasDemo = seed();
}

export function emailTaken(email: string) {
  const s = store();
  return (
    s.staff.some((p) => p.email === email) ||
    s.logins.some((l) => l.email === email)
  );
}

export function takenCodes() {
  return new Set(store().clients.map((c) => c.client_code));
}

export { newClientCode };
