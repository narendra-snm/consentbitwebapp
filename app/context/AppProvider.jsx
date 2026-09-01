"use client";
import { createContext, useContext, useState } from "react";

const AppContext = createContext();

/** Mirrors cookie-banner `appearance` for preview (Layout / Colors / Type). */
const defaultBannerLayout = {
  position: "box",
  alignment: "bottom-left",
  borderRadius: "12",
};

/** Keep in sync with `DEFAULT_APPEARANCE.colors` in `bannerAppearance.ts`. */
const defaultColors = {
  bannerBg: "#ffffff",
  textColor: "#334155",
  headingColor: "#0f172a",
  buttonColor: "#0284c7",
  buttonTextColor: "#ffffff",
  preferencesButtonBg: "#ffffff",
  preferencesButtonText: "#334155",
  savePreferencesButtonBg: "#ffffff",
  savePreferencesButtonText: "#334155",
};

export const AppProvider = ({ children }) => {
  const [colors, setColors] = useState(defaultColors);
  /** Matches `appearance.type.font` (Type tab). */
  const [fontFamily, setFontFamily] = useState("Inter");
  const [weight, setWeight] = useState("Bold");
  /**
   * Matches `appearance.type.fontEnabled` (Type tab → "Font" card). Unticked by default,
   * mirroring cdnM.js, which injects no font-family unless the banner opts in.
   */
  const [fontEnabled, setFontEnabled] = useState(false);
  const [alignment, setAlignment] = useState("left");
  const [bannerLayout, setBannerLayout] = useState(defaultBannerLayout);

  return (
    <AppContext.Provider
      value={{
        colors,
        setColors,
        fontFamily,
        setFontFamily,
        weight,
        setWeight,
        fontEnabled,
        setFontEnabled,
        alignment,
        setAlignment,
        bannerLayout,
        setBannerLayout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
