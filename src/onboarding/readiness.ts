export type M1ReadinessStepId = "profile" | "plan";
export type M1ReadinessStatus = "complete" | "incomplete" | "blocked" | "pending";

export type M1ReadinessInput = {
  hasProfile: boolean;
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
  const foundationReady = input.hasProfile;

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
          descriptionEs: "Crea tu contexto antes de revisar cualquier plan.",
          href: "/perfil",
        },
    foundationReady
      ? {
          id: "plan",
          labelEs: "Plan",
          status: "pending",
          statusLabelEs: "Revisión no-IA",
          descriptionEs: "Perfil listo para revisión manual; generación y activación siguen apagadas.",
          href: "/plan",
        }
      : {
          id: "plan",
          labelEs: "Plan",
          status: "blocked",
          statusLabelEs: "Esperando perfil",
          descriptionEs: "Completa tu perfil antes de revisar cualquier plan.",
        },
  ];

  const foundationSteps = steps.filter((step) => step.id !== "plan");
  const nextStep = foundationSteps.find((step) => step.status !== "complete") ?? steps[1]!;

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
      helperEs: "Empieza aquí para desbloquear la revisión del plan.",
      href: "/perfil",
    };
  }

  return {
    labelEs: "Plan pendiente",
    helperEs: "La generación del plan sigue bloqueada hasta una iteración futura.",
  };
}
