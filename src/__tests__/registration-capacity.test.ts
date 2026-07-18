import { describe, it, expect } from "vitest";
import { getCapacityError, hasCappedWave } from "@/lib/registration-capacity";

const base = {
  cap: null as number | null,
  confirmedTotal: 0,
  requestedTotal: 1,
  waves: [{ label: "General" }, { label: "Late Entry" }],
  usedLabels: ["General"],
  confirmedByWave: {},
  requestedByWave: { General: 1 },
};

describe("getCapacityError — event cap", () => {
  it("allows an order when the event is uncapped", () => {
    expect(getCapacityError({ ...base, cap: null })).toBeNull();
  });

  it("allows an order that fits under the cap", () => {
    expect(getCapacityError({ ...base, cap: 10, confirmedTotal: 8, requestedTotal: 2 })).toBeNull();
  });

  it("rejects an order that would exceed the cap and reports remaining spots", () => {
    const msg = getCapacityError({ ...base, cap: 10, confirmedTotal: 8, requestedTotal: 3 });
    expect(msg).toBe("Only 2 spots left for this event.");
  });

  it("uses the singular form when exactly one spot remains", () => {
    const msg = getCapacityError({ ...base, cap: 10, confirmedTotal: 9, requestedTotal: 2 });
    expect(msg).toBe("Only 1 spot left for this event.");
  });

  it("reports sold out when the event is already full", () => {
    const msg = getCapacityError({ ...base, cap: 10, confirmedTotal: 10, requestedTotal: 1 });
    expect(msg).toBe("This event is sold out.");
  });
});

describe("getCapacityError — per-tier quantity", () => {
  const waves = [{ label: "General", qty: 5 }, { label: "Late Entry" }];

  it("ignores tiers without a quantity cap", () => {
    const msg = getCapacityError({
      ...base,
      waves: [{ label: "General" }],
      usedLabels: ["General"],
      confirmedByWave: { General: 999 },
      requestedByWave: { General: 5 },
    });
    expect(msg).toBeNull();
  });

  it("allows an order that fits within the tier quantity", () => {
    const msg = getCapacityError({
      ...base, waves, usedLabels: ["General"],
      confirmedByWave: { General: 3 }, requestedByWave: { General: 2 },
    });
    expect(msg).toBeNull();
  });

  it("rejects an order that exceeds the tier quantity", () => {
    const msg = getCapacityError({
      ...base, waves, usedLabels: ["General"],
      confirmedByWave: { General: 4 }, requestedByWave: { General: 2 },
    });
    expect(msg).toBe('Only 1 "General" ticket left.');
  });

  it("reports a sold-out tier", () => {
    const msg = getCapacityError({
      ...base, waves, usedLabels: ["General"],
      confirmedByWave: { General: 5 }, requestedByWave: { General: 1 },
    });
    expect(msg).toBe('"General" is sold out.');
  });

  it("checks the event cap before per-tier quantity", () => {
    const msg = getCapacityError({
      ...base, cap: 5, confirmedTotal: 5, requestedTotal: 1,
      waves, usedLabels: ["General"],
      confirmedByWave: { General: 0 }, requestedByWave: { General: 1 },
    });
    expect(msg).toBe("This event is sold out.");
  });
});

describe("hasCappedWave", () => {
  it("is true only when a used tier defines a quantity", () => {
    expect(hasCappedWave([{ label: "General", qty: 5 }], ["General"])).toBe(true);
    expect(hasCappedWave([{ label: "General", qty: 5 }], ["Late Entry"])).toBe(false);
    expect(hasCappedWave([{ label: "General" }], ["General"])).toBe(false);
  });
});
