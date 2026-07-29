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
    { labelEs: "Mediciones", shortLabelEs: "Med.", href: "/mediciones" },
    { labelEs: "Plan", href: "/plan" },
    { labelEs: "Entrenar", shortLabelEs: "Entr.", href: "/entrenar" },
    { labelEs: "Progreso", shortLabelEs: "Prog.", disabledReasonEs: "Disponible después de registrar sesiones." },
  ];
}
