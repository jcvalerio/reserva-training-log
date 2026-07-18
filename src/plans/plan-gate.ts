import type { M1Readiness } from "@/onboarding/readiness";

export type NonAiPlanGate =
  | {
      status: "blocked";
      titleEs: string;
      descriptionEs: string;
      ctaLabelEs: string;
      ctaHref: string;
      canGenerateAi: false;
    }
  | {
      status: "manual_review_ready";
      titleEs: string;
      descriptionEs: string;
      ctaLabelEs: string;
      ctaHref: string;
      canGenerateAi: false;
    };

export function getNonAiPlanGate(readiness: M1Readiness): NonAiPlanGate {
  if (!readiness.foundationReady) {
    return {
      status: "blocked",
      titleEs: "Bases incompletas",
      descriptionEs: `Antes del plan falta: ${readiness.nextStep.labelEs}. No se genera AI desde esta pantalla.`,
      ctaLabelEs: readiness.primaryAction.labelEs,
      ctaHref: readiness.primaryAction.href ?? "/",
      canGenerateAi: false,
    };
  }

  return {
    status: "manual_review_ready",
    titleEs: "Listo para revisión manual",
    descriptionEs: "Perfil, pesos base y mediciones están listos para revisar antes de habilitar cualquier generación de plan.",
    ctaLabelEs: "Volver a Inicio",
    ctaHref: "/",
    canGenerateAi: false,
  };
}
