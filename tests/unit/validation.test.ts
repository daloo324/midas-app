import { describe, expect, it } from "vitest";
import {
  clientSignInSchema,
  LOGIN_ID_PATTERN,
  normaliseLoginId,
  setPasswordSchema,
  staffInviteSchema,
} from "@/lib/validation/auth";
import { clientAdminSchema, newClientSchema } from "@/lib/validation/clients";

describe("client login IDs", () => {
  it("trims and uppercases what the client types", () => {
    expect(normaliseLoginId("  mm-kgc-2611 ")).toBe("MM-KGC-2611");
    expect(
      clientSignInSchema.parse({ loginId: " mm-kgc-2611-2", password: "x" })
        .loginId,
    ).toBe("MM-KGC-2611-2");
  });

  it("matches the MM-XXX-0000 format, with an optional user suffix", () => {
    expect(LOGIN_ID_PATTERN.test("MM-KGC-2611")).toBe(true);
    expect(LOGIN_ID_PATTERN.test("MM-KGC-2611-2")).toBe(true);
    expect(LOGIN_ID_PATTERN.test("MM-KG-2611")).toBe(false);
    expect(LOGIN_ID_PATTERN.test("XX-KGC-2611")).toBe(false);
  });
});

describe("setPasswordSchema", () => {
  it("needs at least 10 characters", () => {
    const r = setPasswordSchema.safeParse({
      password: "short",
      confirm: "short",
    });
    expect(r.success).toBe(false);
  });

  it("needs both passwords to match", () => {
    const r = setPasswordSchema.safeParse({
      password: "long-enough-1",
      confirm: "long-enough-2",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["confirm"]);
  });

  it("accepts a good password", () => {
    expect(
      setPasswordSchema.safeParse({
        password: "long-enough-1",
        confirm: "long-enough-1",
      }).success,
    ).toBe(true);
  });
});

describe("staffInviteSchema", () => {
  it("lowercases the email and only allows staff roles", () => {
    expect(
      staffInviteSchema.parse({
        fullName: " Neo ",
        email: "Neo@Example.com ",
        role: "designer",
      }),
    ).toEqual({
      fullName: "Neo",
      email: "neo@example.com",
      role: "designer",
    });
    expect(
      staffInviteSchema.safeParse({
        fullName: "Neo",
        email: "neo@example.com",
        role: "client",
      }).success,
    ).toBe(false);
  });
});

describe("client forms", () => {
  const ids = {
    accountExecId: "10000000-0000-4000-8000-000000000002",
    serviceId: "20000000-0000-4000-8000-000000000001",
  };

  it("turns empty optional fields into null", () => {
    const r = newClientSchema.parse({
      name: "Shop",
      industry: "",
      contactEmail: "",
      contactPhone: "",
      ...ids,
    });
    expect(r.industry).toBeNull();
    expect(r.contactEmail).toBeNull();
  });

  it("rejects a bad contact email", () => {
    expect(
      newClientSchema.safeParse({ name: "Shop", contactEmail: "nope", ...ids })
        .success,
    ).toBe(false);
  });

  it("only allows real statuses and dates", () => {
    const base = { clientId: ids.serviceId, ...ids };
    expect(
      clientAdminSchema.safeParse({
        ...base,
        status: "active",
        startDate: "2026-11-01",
      }).success,
    ).toBe(true);
    expect(
      clientAdminSchema.safeParse({ ...base, status: "deleted" }).success,
    ).toBe(false);
    expect(
      clientAdminSchema.safeParse({
        ...base,
        status: "active",
        startDate: "1/11/2026",
      }).success,
    ).toBe(false);
  });
});
