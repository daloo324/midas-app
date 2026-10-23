import { describe, expect, it } from "vitest";
import { clientCodeLetters, newClientCode } from "@/lib/clients/code";

describe("clientCodeLetters (mirrors supabase/tests/002_database_rules.sql)", () => {
  it.each([
    ["Kgosi Coffee", "KGC"],
    ["Sample Coffee Co", "SCC"],
    ["Mma Ramotswe Detective Agency", "MRD"],
    ["Nandos", "NAN"],
    ["3 Brothers & Co.", "BRC"],
    ["a b", "ABX"],
    ["kgosi  coffee", "KGC"],
  ])("%s -> %s", (name, letters) => {
    expect(clientCodeLetters(name)).toBe(letters);
  });
});

describe("newClientCode", () => {
  it("makes an MM-XXX-0000 code that isn't already used", () => {
    const values = [0.2611, 0.2611, 0.0042];
    const random = () => values.shift() ?? 0.5;
    expect(
      newClientCode("Kgosi Coffee", new Set(["MM-KGC-2611"]), random),
    ).toBe("MM-KGC-0042");
  });
});
