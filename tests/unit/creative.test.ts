import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  contrastVerdict,
  extensionOf,
  fontStack,
  hexToCmyk,
  hexToRgb,
  slotAccepts,
  textOn,
} from "@/lib/creative/constants";

describe("colour maths", () => {
  it("converts HEX to RGB and CMYK", () => {
    expect(hexToRgb("#0E2A36")).toEqual([14, 42, 54]);
    expect(hexToCmyk("#000000")).toEqual([0, 0, 0, 100]);
    expect(hexToCmyk("#FFFFFF")).toEqual([0, 0, 0, 0]);
    expect(hexToCmyk("#FF0000")).toEqual([0, 100, 100, 0]);
  });

  it("works out contrast and the verdict", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
    expect(contrastVerdict(4.5).label).toBe("Body text OK");
    expect(contrastVerdict(3.2).label).toBe("Large text only");
    expect(contrastVerdict(2.9).label).toBe("Avoid");
    expect(textOn("#0E2A36")).toBe("#FFFFFF");
    expect(textOn("#F2CF45")).toBe("#000000");
  });
});

describe("kit slots", () => {
  it("each slot takes only its own file types", () => {
    expect(slotAccepts("logo_white_png", "Logo.PNG")).toBe(true);
    expect(slotAccepts("logo_white_png", "logo.svg")).toBe(false);
    expect(slotAccepts("font_heading_500", "a.otf")).toBe(true);
    expect(slotAccepts("font_heading_500", "a.zip")).toBe(false);
    expect(slotAccepts("guide_pdf", "guide.pdf")).toBe(true);
    expect(slotAccepts("extra", "texture.jpeg")).toBe(true);
    expect(slotAccepts("nope", "x.svg")).toBe(false);
    expect(extensionOf("archive.tar.gz")).toBe("gz");
  });

  it("builds safe font stacks", () => {
    expect(fontStack("Lora")).toBe("'Lora', Georgia, serif");
    expect(fontStack("Bad'; } body { x")).toBe(
      "'Bad } body { x', Arial, sans-serif",
    );
    expect(fontStack(null)).toBe("Arial, sans-serif");
  });
});

import { movesFor } from "@/lib/creative/moves";

describe("status moves on the board", () => {
  it("only the creative director sends work to the client", () => {
    expect(movesFor("internal_review", "designer").map((m) => m.to)).toEqual(
      [],
    );
    expect(
      movesFor("internal_review", "creative_director").map((m) => m.to),
    ).toEqual(["client_review", "changes_requested"]);
    expect(movesFor("internal_review", "ceo").map((m) => m.to)).toEqual([
      "client_review",
      "changes_requested",
    ]);
  });
  it("designers move their own work forward", () => {
    expect(movesFor("planned", "designer").map((m) => m.to)).toEqual([
      "in_design",
    ]);
    expect(movesFor("changes_requested", "designer").map((m) => m.to)).toEqual([
      "in_design",
    ]);
    expect(movesFor("client_review", "designer")).toEqual([]);
  });
});
