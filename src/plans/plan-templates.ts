import { createFatLossPlan } from "./fat-loss-plan";
import type { GeneratedWorkoutPlan } from "./generated-plan-schema";
import { createLegPriorityPlan } from "./leg-priority-plan";
import { createSeededHypertrophyPlan } from "./seeded-plan";

export type PlanTemplateId = "hypertrophy" | "fat_loss" | "hypertrophy_legs";

export type PlanTemplateMeta = {
  id: PlanTemplateId;
  nameEs: string;
  objectiveEs: string;
  shortDescriptionEs: string;
  build: () => GeneratedWorkoutPlan;
};

export const planTemplates: PlanTemplateMeta[] = [
  {
    id: "hypertrophy",
    nameEs: "Hipertrofia — 5 días, división muscular",
    objectiveEs: "Ganancia muscular",
    shortDescriptionEs: "5 días por semana, un grupo muscular principal por sesión, sets x reps x RIR.",
    build: createSeededHypertrophyPlan,
  },
  {
    id: "fat_loss",
    nameEs: "Reducción de grasa corporal — circuito A/B",
    objectiveEs: "Reducción de peso y grasa corporal",
    shortDescriptionEs: "5 días por semana alternando Rutina A/B, circuitos de fuerza y acondicionamiento.",
    build: createFatLossPlan,
  },
  {
    id: "hypertrophy_legs",
    nameEs: "Hipertrofia con prioridad en piernas — 5 días",
    objectiveEs: "Ganancia muscular, énfasis en piernas",
    shortDescriptionEs:
      "5 días, todo en máquinas, progresión unilateral (empieza por la pierna más delgada) y esquema RIR por serie.",
    build: createLegPriorityPlan,
  },
];

export function getPlanTemplateById(id: string): PlanTemplateMeta | undefined {
  return planTemplates.find((template) => template.id === id);
}

export function isPlanTemplateId(id: string): id is PlanTemplateId {
  return planTemplates.some((template) => template.id === id);
}
