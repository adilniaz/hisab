import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/export-utils";

describe("toCsv — formula injection guard", () => {
  it.each([
    ["=cmd|'/c calc'!A1", "'=cmd|'/c calc'!A1"],
    ["+1+1", "'+1+1"],
    ["-1+1", "'-1+1"],
    ["@SUM(A1:A9)", "'@SUM(A1:A9)"],
  ])("prefixes a leading %s with an apostrophe", (input, expected) => {
    const csv = toCsv(["name"], [[input]]);
    expect(csv).toBe(`name\n${expected}`);
  });

  it("leaves ordinary text untouched", () => {
    expect(toCsv(["name"], [["Regular Donor"]])).toBe("name\nRegular Donor");
  });

  it("still quotes fields containing commas, quotes, or newlines", () => {
    expect(toCsv(["notes"], [['has, a "quote"']])).toBe('notes\n"has, a ""quote"""');
  });

  it("still escapes an injection payload that also needs comma quoting", () => {
    const csv = toCsv(["notes"], [["=SUM(A1,A2)"]]);
    expect(csv).toBe('notes\n"\'=SUM(A1,A2)"');
  });

  it("handles null and undefined cells", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("a,b\n,");
  });
});
