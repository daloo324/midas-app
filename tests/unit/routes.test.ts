import { describe, expect, it } from "vitest";
import {
  areaOf,
  canEnter,
  destinationAfterSignIn,
  homeFor,
  safeNext,
  signInNeededFor,
} from "@/lib/auth/routes";

describe("homeFor", () => {
  it("sends each role to its own area", () => {
    expect(homeFor("ceo")).toBe("/admin");
    expect(homeFor("account_exec")).toBe("/accounts");
    expect(homeFor("creative_director")).toBe("/creative");
    expect(homeFor("designer")).toBe("/creative");
    expect(homeFor("client")).toBe("/portal");
  });
});

describe("canEnter", () => {
  it("matches the area rules in 01-auth-and-roles.md", () => {
    expect(canEnter("admin", "ceo")).toBe(true);
    expect(canEnter("admin", "account_exec")).toBe(false);
    expect(canEnter("accounts", "ceo")).toBe(true);
    expect(canEnter("accounts", "account_exec")).toBe(true);
    expect(canEnter("accounts", "designer")).toBe(false);
    expect(canEnter("creative", "ceo")).toBe(true);
    expect(canEnter("creative", "creative_director")).toBe(true);
    expect(canEnter("creative", "designer")).toBe(true);
    expect(canEnter("creative", "account_exec")).toBe(false);
    expect(canEnter("portal", "client")).toBe(true);
    expect(canEnter("portal", "ceo")).toBe(false);
  });
});

describe("signInNeededFor", () => {
  it("knows which sign-in page each path needs", () => {
    expect(signInNeededFor("/admin")).toBe("staff");
    expect(signInNeededFor("/admin/team")).toBe("staff");
    expect(signInNeededFor("/accounts")).toBe("staff");
    expect(signInNeededFor("/creative/time")).toBe("staff");
    expect(signInNeededFor("/portal")).toBe("client");
    expect(signInNeededFor("/portal/invoices")).toBe("client");
    expect(signInNeededFor("/portal/preview/abc")).toBe("staff");
  });

  it("leaves public pages alone", () => {
    expect(signInNeededFor("/login")).toBeNull();
    expect(signInNeededFor("/portal/login")).toBeNull();
    expect(signInNeededFor("/portal/login/forgot")).toBeNull();
    expect(signInNeededFor("/start/abc")).toBeNull();
    expect(signInNeededFor("/set-password")).toBeNull();
  });

  it("doesn't match look-alike paths", () => {
    expect(signInNeededFor("/administrator")).toBeNull();
    expect(signInNeededFor("/portality")).toBeNull();
  });
});

describe("safeNext", () => {
  it("allows same-site paths only", () => {
    expect(safeNext("/admin/team", "/x")).toBe("/admin/team");
    expect(safeNext("//evil.example", "/x")).toBe("/x");
    expect(safeNext("https://evil.example", "/x")).toBe("/x");
    expect(safeNext("/\\evil.example", "/x")).toBe("/x");
    expect(safeNext(undefined, "/x")).toBe("/x");
  });
});

describe("destinationAfterSignIn", () => {
  it("returns to the page they wanted when their role may open it", () => {
    expect(destinationAfterSignIn("/admin/clients?status=active", "ceo")).toBe(
      "/admin/clients?status=active",
    );
    expect(destinationAfterSignIn("/portal/invoices", "client")).toBe(
      "/portal/invoices",
    );
  });

  it("goes home otherwise", () => {
    expect(destinationAfterSignIn("/admin", "designer")).toBe("/creative");
    expect(destinationAfterSignIn("/login", "ceo")).toBe("/admin");
    expect(destinationAfterSignIn("//evil.example", "client")).toBe("/portal");
    expect(destinationAfterSignIn(undefined, "account_exec")).toBe("/accounts");
  });

  it("treats the portal preview as a CEO page", () => {
    expect(areaOf("/portal/preview/abc")).toBe("admin");
    expect(destinationAfterSignIn("/portal/preview/abc", "client")).toBe(
      "/portal",
    );
  });
});
