import { describe, expect, it } from "vitest";

import {
  parsePlanBuilderSessionFormData,
  parsePlanBuilderSessionInfoFormData,
  parsePlanBuilderSetupFormData,
} from "./plan-builder-schema";

describe("parsePlanBuilderSetupFormData", () => {
  it("parses a valid draft setup", () => {
    const formData = new FormData();
    formData.set("nameEs", "  Mi rutina  ");
    formData.set("daysPerWeek", "4");

    expect(parsePlanBuilderSetupFormData(formData)).toEqual({ nameEs: "Mi rutina", daysPerWeek: 4 });
  });

  it("requires a plan name", () => {
    const formData = new FormData();
    formData.set("daysPerWeek", "4");

    expect(() => parsePlanBuilderSetupFormData(formData)).toThrow();
  });

  it("rejects daysPerWeek outside of 1-7", () => {
    const formData = new FormData();
    formData.set("nameEs", "Mi rutina");
    formData.set("daysPerWeek", "8");

    expect(() => parsePlanBuilderSetupFormData(formData)).toThrow();
  });
});

describe("parsePlanBuilderSessionInfoFormData", () => {
  it("parses name and focus, defaulting duration and mobility notes when omitted", () => {
    const formData = new FormData();
    formData.set("nameEs", "Pierna — cuádriceps");
    formData.set("focus", "Cuádriceps y pantorrilla");

    expect(parsePlanBuilderSessionInfoFormData(formData)).toEqual({
      nameEs: "Pierna — cuádriceps",
      focus: "Cuádriceps y pantorrilla",
      estimatedDurationMinutes: 60,
      mobilityNotesEs: "Incluye 5-8 minutos de movilidad específica y calentamiento progresivo.",
    });
  });

  it("requires a session name and focus", () => {
    const formData = new FormData();
    formData.set("focus", "Cuádriceps");

    expect(() => parsePlanBuilderSessionInfoFormData(formData)).toThrow();
  });
});

describe("parsePlanBuilderSessionFormData", () => {
  it("parses one fully-specified exercise row", () => {
    const formData = new FormData();
    formData.set("rowCount", "1");
    formData.set("exercise-0:exerciseNameEs", "Prensa de piernas");
    formData.set("exercise-0:phase", "main");
    formData.set("exercise-0:isUnilateral", "on");
    formData.set("exercise-0:targetSets", "4");
    formData.set("exercise-0:targetRepMin", "8");
    formData.set("exercise-0:targetRepMax", "12");
    formData.set("exercise-0:targetRir", "2");
    formData.set("exercise-0:restSeconds", "150");
    formData.set("exercise-0:notesEs", "Sube 2.5kg si completas todas las series.");
    formData.set("exercise-0:painSensitive", "on");
    formData.set("exercise-0:substitutionOptionsEs", "Sentadilla en máquina, Hack squat");
    formData.set("exercise-0:loadMechanism", "machine");
    formData.set("exercise-0:isCompound", "true");

    expect(parsePlanBuilderSessionFormData(formData)).toEqual([
      {
        exerciseNameEs: "Prensa de piernas",
        phase: "main",
        isUnilateral: true,
        targetSets: 4,
        targetRepMin: 8,
        targetRepMax: 12,
        targetRir: 2,
        restSeconds: 150,
        notesEs: "Sube 2.5kg si completas todas las series.",
        painSensitive: true,
        substitutionOptionsEs: ["Sentadilla en máquina", "Hack squat"],
        loadMechanism: "machine",
        isCompound: true,
      },
    ]);
  });

  it("fills in defaults for a minimally-specified row", () => {
    const formData = new FormData();
    formData.set("rowCount", "1");
    formData.set("exercise-0:exerciseNameEs", "Extensión de piernas");
    formData.set("exercise-0:targetSets", "3");
    formData.set("exercise-0:targetRepMin", "12");
    formData.set("exercise-0:targetRepMax", "15");
    formData.set("exercise-0:targetRir", "2");

    expect(parsePlanBuilderSessionFormData(formData)).toEqual([
      {
        exerciseNameEs: "Extensión de piernas",
        phase: "main",
        isUnilateral: false,
        targetSets: 3,
        targetRepMin: 12,
        targetRepMax: 15,
        targetRir: 2,
        restSeconds: 90,
        notesEs: "Ajusta la carga y conserva técnica.",
        painSensitive: false,
        substitutionOptionsEs: [],
        loadMechanism: undefined,
        isCompound: undefined,
      },
    ]);
  });

  it("skips rows the user never filled in (e.g. an unused added row)", () => {
    const formData = new FormData();
    formData.set("rowCount", "2");
    formData.set("exercise-0:exerciseNameEs", "Prensa de piernas");
    formData.set("exercise-0:targetSets", "4");
    formData.set("exercise-0:targetRepMin", "8");
    formData.set("exercise-0:targetRepMax", "12");
    formData.set("exercise-0:targetRir", "2");
    // exercise-1 left entirely blank

    expect(parsePlanBuilderSessionFormData(formData)).toHaveLength(1);
  });

  it("throws when every row is blank", () => {
    const formData = new FormData();
    formData.set("rowCount", "1");

    expect(() => parsePlanBuilderSessionFormData(formData)).toThrow(
      "Agrega al menos un ejercicio antes de guardar esta sesión.",
    );
  });

  it("rejects a row missing a required field, like RIR", () => {
    const formData = new FormData();
    formData.set("rowCount", "1");
    formData.set("exercise-0:exerciseNameEs", "Prensa de piernas");
    formData.set("exercise-0:targetSets", "4");
    formData.set("exercise-0:targetRepMin", "8");
    formData.set("exercise-0:targetRepMax", "12");

    expect(() => parsePlanBuilderSessionFormData(formData)).toThrow();
  });

  it("rejects targetRepMin greater than targetRepMax", () => {
    const formData = new FormData();
    formData.set("rowCount", "1");
    formData.set("exercise-0:exerciseNameEs", "Prensa de piernas");
    formData.set("exercise-0:targetSets", "4");
    formData.set("exercise-0:targetRepMin", "15");
    formData.set("exercise-0:targetRepMax", "12");
    formData.set("exercise-0:targetRir", "2");

    expect(() => parsePlanBuilderSessionFormData(formData)).toThrow();
  });
});
