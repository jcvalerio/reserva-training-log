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

export type M1ReadinessPrimaryAction = {
  labelEs: string;
  helperEs: string;
  href?: string;
};

export type M1Readiness = {
  steps: M1ReadinessStep[];
  completedFoundationSteps: number;
  totalFoundationSteps: number;
  foundationReady: boolean;
  nextStep: M1ReadinessStep;
  primaryAction: M1ReadinessPrimaryAction;
};

export function getM1Readiness(input: M1ReadinessInput): M1Readiness {
  const hasBaseline = input.baselineLiftCount > 0;
  const hasMeasurements = input.bodyMeasurementCount > 0;
  const foundationReady = input.hasProfile && hasBaseline && hasMeasurements;

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
    foundationReady
      ? {
          id: "plan",
          labelEs: "Plan",
          status: "pending",
          statusLabelEs: "Revisión no-IA",
          descriptionEs: "Bases listas para revisión manual; generación y activación siguen apagadas.",
          href: "/plan",
        }
      : {
          id: "plan",
          labelEs: "Plan",
          status: "blocked",
          statusLabelEs: "Esperando bases",
          descriptionEs: "Completa perfil, pesos base y mediciones antes de revisar cualquier plan.",
        },
  ];

  const foundationSteps = steps.filter((step) => step.id !== "plan");
  const nextStep = foundationSteps.find((step) => step.status !== "complete") ?? steps[3];

  return {
    steps,
    completedFoundationSteps: foundationSteps.filter((step) => step.status === "complete").length,
    totalFoundationSteps: foundationSteps.length,
    foundationReady,
    nextStep,
    primaryAction: getPrimaryAction(nextStep, foundationReady),
  };
}

function getPrimaryAction(nextStep: M1ReadinessStep, foundationReady: boolean): M1ReadinessPrimaryAction {
  if (foundationReady) {
    return {
      labelEs: "Revisar preparación del plan",
      helperEs: "Abre la revisión no-IA: no genera, guarda ni activa un plan todavía.",
      href: "/plan",
    };
  }

  if (nextStep.id === "profile") {
    return {
      labelEs: "Crear o completar perfil",
      helperEs: "Empieza aquí para desbloquear pesos base y mediciones.",
      href: "/perfil",
    };
  }

  if (nextStep.id === "baseline") {
    return {
      labelEs: "Registrar pesos base",
      helperEs: "Guarda al menos una fila completa con kg, reps, series, RIR y dolor.",
      href: "/baseline",
    };
  }

  if (nextStep.id === "measurements") {
    return {
      labelEs: "Guardar primera medición",
      helperEs: "Una medida numérica basta para crear el punto de partida corporal.",
      href: "/mediciones",
    };
  }

  return {
    labelEs: "Plan pendiente",
    helperEs: "La generación del plan sigue bloqueada hasta una iteración futura.",
  };
}
