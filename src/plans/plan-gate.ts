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
      titleEs: "Completa bases antes del plan",
      descriptionEs: `Falta ${readiness.nextStep.labelEs}. Este botón solo abre el paso pendiente; no genera IA, no guarda y no activa ningún plan.`,
      ctaLabelEs: `Ir a ${readiness.nextStep.labelEs}`,
      ctaHref: readiness.primaryAction.href ?? "/",
      canGenerateAi: false,
    };
  }

  return {
    status: "manual_review_ready",
    titleEs: "Base lista para revisión no-AI",
    descriptionEs: "Perfil, pesos base y mediciones están listos para una revisión manual. Todavía no se genera, guarda ni activa un plan.",
    ctaLabelEs: "Volver al resumen de Inicio",
    ctaHref: "/",
    canGenerateAi: false,
  };
}
