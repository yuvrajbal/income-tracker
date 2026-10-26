"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "theme";

/**
 * Runs inline in <head> before first paint so there's no light/dark flash.
 * Keep in sync with applyTheme() below.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;

function systemTheme(): ResolvedTheme {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getThemePref(): ThemePref {
  return (localStorage.getItem(THEME_KEY) as ThemePref | null) ?? "system";
}

export function applyTheme(pref: ThemePref) {
  localStorage.setItem(THEME_KEY, pref);
  document.documentElement.setAttribute("data-theme", pref === "system" ? systemTheme() : pref);
  window.dispatchEvent(new Event("themepref"));
}

// Follow OS changes while the preference is "system".
if (typeof window !== "undefined") {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getThemePref() === "system") applyTheme("system");
  });
}

function subscribeResolved(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

/** The theme actually on screen. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribeResolved,
    () => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"),
    () => "light",
  );
}

function subscribePref(cb: () => void) {
  window.addEventListener("themepref", cb);
  return () => window.removeEventListener("themepref", cb);
}

export function useThemePref(): ThemePref | null {
  return useSyncExternalStore(subscribePref, getThemePref, () => null);
}

// Chart colors as hex: SVG presentation attributes can't read CSS variables.
// Mirrors --series-* in globals.css (validated categorical palette, fixed order).
const SERIES: Record<ResolvedTheme, string[]> = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

const CHART_INK: Record<ResolvedTheme, { surface: string; grid: string; axis: string; text: string }> = {
  light: { surface: "#fcfcfb", grid: "#ecebe7", axis: "#8a8984", text: "#52514e" },
  dark: { surface: "#1a1a19", grid: "#2a2a27", axis: "#8d8c84", text: "#c3c2b7" },
};

export function useChartColors() {
  const theme = useResolvedTheme();
  return {
    series: (slot: number) => SERIES[theme][(slot - 1) % 8],
    ...CHART_INK[theme],
  };
}
