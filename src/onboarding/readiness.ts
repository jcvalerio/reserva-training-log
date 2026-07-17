export type M1ReadinessStepId = "profile" | "baseline" | "measurements" | "plan";
export type M1ReadinessStatus = "complete" | "incomplete" | "blocked" | "pending";

export type M1ReadinessInput = {
  hasProfile: boolean;
  baselineLiftCount: number;
  bodyMeasurementCount: number;
};

export type M1ReadinessStep = {
  id: M1ReadinessStepId;
  labelEs: string;
  status: M1ReadinessStatus;
  statusLabelEs: string;
  descriptionEs: string;
  href?: string;
};

export type M1Readiness = {
  steps: M1ReadinessStep[];
  completedFoundationSteps: number;
  totalFoundationSteps: number;
  foundationReady: boolean;
  nextStep: M1ReadinessStep;
};

export function getM1Readiness(input: M1ReadinessInput): M1Readiness {
  const hasBaseline = input.baselineLiftCount > 0;
  const hasMeasurements = input.bodyMeasurementCount > 0;

  const steps: M1ReadinessStep[] = [
    input.hasProfile
      ? {
          id: "profile",
          labelEs: "Perfil",
          status: "complete",
          statusLabelEs: "Listo",
          descriptionEs: "Contexto de atleta guardado.",
          href: "/perfil",
        }
      : {
          id: "profile",
          labelEs: "Perfil",
          status: "incomplete",
          statusLabelEs: "Pendiente",
          descriptionEs: "Crea tu contexto antes de pesos, mediciones y plan.",
          href: "/perfil",
        },
    hasBaseline
      ? {
          id: "baseline",
          labelEs: "Pesos base",
          status: "complete",
          statusLabelEs: "Listo",
          descriptionEs: `${input.baselineLiftCount} entradas de trabajo guardadas.`,
          href: "/baseline",
        }
      : {
          id: "baseline",
          labelEs: "Pesos base",
          status: input.hasProfile ? "incomplete" : "blocked",
          statusLabelEs: input.hasProfile ? "Pendiente" : "Requiere perfil",
          descriptionEs: "Registra al menos un ejercicio con kg, reps, series, RIR y dolor.",
          href: input.hasProfile ? "/baseline" : "/perfil",
        },
    hasMeasurements
      ? {
          id: "measurements",
          labelEs: "Mediciones",
          status: "complete",
          statusLabelEs: "Listo",
          descriptionEs: "Punto de partida corporal guardado.",
          href: "/mediciones",
        }
      : {
          id: "measurements",
          labelEs: "Mediciones",
          status: input.hasProfile ? "incomplete" : "blocked",
          statusLabelEs: input.hasProfile ? "Pendiente" : "Requiere perfil",
          descriptionEs: "Guarda al menos una medida numérica; cadencia sugerida: cada 2 semanas.",
          href: input.hasProfile ? "/mediciones" : "/perfil",
        },
    {
      id: "plan",
      labelEs: "Plan",
      status: "pending",
      statusLabelEs: "No iniciado",
      descriptionEs: "La generación del plan sigue pendiente; todavía no se ejecuta AI.",
    },
  ];

  const foundationSteps = steps.filter((step) => step.id !== "plan");
  const nextStep = foundationSteps.find((step) => step.status !== "complete") ?? steps[3];

  return {
    steps,
    completedFoundationSteps: foundationSteps.filter((step) => step.status === "complete").length,
    totalFoundationSteps: foundationSteps.length,
    foundationReady: foundationSteps.every((step) => step.status === "complete"),
    nextStep,
  };
}
