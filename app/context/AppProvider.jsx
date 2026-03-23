"use client";
import { createContext, useContext, useState } from "react";

const AppContext = createContext();

/** Mirrors cookie-banner `appearance` for preview (Layout / Colors / Type). */
const defaultBannerLayout = { position: "box", alignment: "bottom-left" };

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
