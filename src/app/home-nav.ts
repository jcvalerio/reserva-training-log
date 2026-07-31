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
    { labelEs: "Mediciones", shortLabelEs: "Med.", href: "/mediciones" },
    { labelEs: "Plan", href: "/plan" },
    { labelEs: "Entrenar", shortLabelEs: "Entr.", href: "/entrenar" },
    { labelEs: "Progreso", shortLabelEs: "Prog.", href: "/progreso" },
  ];
}
