import { describe, it, expect } from "vitest";
import { averageOverallRating, toOrganiserRating } from "@/lib/reviews";

describe("averageOverallRating", () => {
  it("returns null for an empty list", () => {
    expect(averageOverallRating([])).toBeNull();
  });

  it("returns the rating for a single review", () => {
    expect(averageOverallRating([{ overallRating: 5 }])).toBe(5);
    expect(averageOverallRating([4])).toBe(4);
  });

  it("rounds to one decimal place", () => {
    expect(averageOverallRating([5, 4, 5])).toBe(4.7);
    expect(averageOverallRating([{ overallRating: 4 }, { overallRating: 5 }])).toBe(4.5);
  });
});

describe("toOrganiserRating", () => {
  it("returns null when count is 0", () => {
    expect(toOrganiserRating(4.5, 0)).toBeNull();
  });

  it("returns null when average is missing", () => {
    expect(toOrganiserRating(null, 3)).toBeNull();
  });

  it("rounds average and keeps count", () => {
    expect(toOrganiserRating(4.666, 7)).toEqual({ average: 4.7, count: 7 });
  });
});
