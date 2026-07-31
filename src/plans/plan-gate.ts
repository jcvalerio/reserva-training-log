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
      descriptionEs: `Falta ${readiness.nextStep.labelEs}. Este botón solo abre el paso pendiente; no guarda ni activa ningún plan.`,
      ctaLabelEs: `Ir a ${readiness.nextStep.labelEs}`,
      ctaHref: readiness.primaryAction.href ?? "/",
      canGenerateAi: false,
    };
  }

  return {
    status: "manual_review_ready",
    titleEs: "Listo para elegir tu plan",
    descriptionEs: "Tu perfil está listo. Elige una plantilla o crea tu propio plan para empezar a entrenar.",
    ctaLabelEs: "Volver al resumen de Inicio",
    ctaHref: "/",
    canGenerateAi: false,
  };
}
