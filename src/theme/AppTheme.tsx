import React, { createContext, useContext } from "react";

import type { ThemePreference } from "../auth/types";

export type ThemeColors = {
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  cyan: string;
  green: string;
  red: string;
  orange: string;
  blue: string;
};

export type AppThemeValue = {
  colors: ThemeColors;
  styles: Record<string, any>;
  currencyCode: string;
};

const darkColors: ThemeColors = {
  bg: "#061321",
  panel: "#0B1D30",
  panel2: "#10263D",
  border: "#183750",
  text: "#F5F8FC",
  muted: "#8FA5BA",
  primary: "#6C63FF",
  cyan: "#25D9C2",
  green: "#3BE0A1",
  red: "#FF647C",
  orange: "#FF9B4A",
  blue: "#48A9FF",
};

const lightColors: ThemeColors = {
  bg: "#F2F6FA",
  panel: "#FFFFFF",
  panel2: "#E7EEF5",
  border: "#D2DDE8",
  text: "#10243A",
  muted: "#5C6F82",
  primary: "#5548D9",
  cyan: "#087F82",
  green: "#14734F",
  red: "#BD3D53",
  orange: "#9A4D0C",
  blue: "#17689A",
};

export function resolveThemeColors(preference: ThemePreference, systemScheme: "light" | "dark" | null | undefined): ThemeColors {
  const resolved = preference === "system" ? systemScheme ?? "light" : preference;
  return resolved === "light" ? lightColors : darkColors;
}

const AppThemeContext = createContext<AppThemeValue | null>(null);

export function AppThemeProvider({ value, children }: { value: AppThemeValue; children: React.ReactNode }) {
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
  const value = useContext(AppThemeContext);
  if (!value) throw new Error("useAppTheme must be used inside AppThemeProvider.");
  return value;
}

export function useMoneyFormatter(): (value: number) => string {
  const { currencyCode } = useAppTheme();
  return (value) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currencyCode} ${Math.round(value).toLocaleString("en-IN")}`;
    }
  };
}