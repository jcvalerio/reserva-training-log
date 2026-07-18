export type HomeNavItem =
  | {
      labelEs: string;
      shortLabelEs?: string;
      href: string;
      disabledReasonEs?: never;
    }
  | {
      labelEs: string;
      shortLabelEs?: string;
      href?: never;
      disabledReasonEs: string;
    };

export function getHomeNavItems(): HomeNavItem[] {
  return [
    { labelEs: "Inicio", href: "/" },
    { labelEs: "Perfil", href: "/perfil" },
    { labelEs: "Pesos base", shortLabelEs: "Base", href: "/baseline" },
    { labelEs: "Mediciones", href: "/mediciones" },
    { labelEs: "Plan", href: "/plan" },
    { labelEs: "Entrenar", disabledReasonEs: "Disponible después de tener un plan activo." },
    { labelEs: "Progreso", disabledReasonEs: "Disponible después de registrar sesiones." },
  ];
}
