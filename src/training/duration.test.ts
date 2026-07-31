import { describe, expect, it } from "vitest";

import { convertDurationValue, durationInputToSeconds, secondsToDurationInput } from "./duration";

describe("secondsToDurationInput", () => {
  it("shows whole-minute durations in minutes", () => {
    expect(secondsToDurationInput(300)).toEqual({ unit: "minutes", value: 5 });
    expect(secondsToDurationInput(60)).toEqual({ unit: "minutes", value: 1 });
  });

  it("shows durations that aren't a whole number of minutes in seconds", () => {
    expect(secondsToDurationInput(45)).toEqual({ unit: "seconds", value: 45 });
    expect(secondsToDurationInput(90)).toEqual({ unit: "seconds", value: 90 });
  });

  it("defaults to 60 seconds when there is no prior value", () => {
    expect(secondsToDurationInput(null)).toEqual({ unit: "seconds", value: 60 });
  });
});

describe("convertDurationValue", () => {
  it("converts seconds to minutes, rounded to one decimal place", () => {
    expect(convertDurationValue(300, "seconds", "minutes")).toBe(5);
    expect(convertDurationValue(45, "seconds", "minutes")).toBe(0.8);
  });

  it("converts minutes to whole seconds", () => {
    expect(convertDurationValue(5, "minutes", "seconds")).toBe(300);
    expect(convertDurationValue(1.5, "minutes", "seconds")).toBe(90);
  });

  it("returns the value unchanged when the unit doesn't change", () => {
    expect(convertDurationValue(45, "seconds", "seconds")).toBe(45);
  });
});

describe("durationInputToSeconds", () => {
  it("passes seconds through as a whole number", () => {
    expect(durationInputToSeconds(45, "seconds")).toBe(45);
  });

  it("converts minutes to whole seconds", () => {
    expect(durationInputToSeconds(5, "minutes")).toBe(300);
    expect(durationInputToSeconds(1.5, "minutes")).toBe(90);
  });
});
