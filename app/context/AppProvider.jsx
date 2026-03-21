"use client";
import { createContext, useContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [colors, setColors] = useState({
    bannerBg: "#FFFFFF",
    textColor: "#000000",
    headingColor: "#000000",
    buttonColor: "#FFFFFF",
    buttonTextColor: "#007AFF",
    SecButtonColor: "#007AFF",
    SecButtonTextColor: "#FFFFFF",
    textAlign: "left",
  });
const [weight, setWeight] = useState('Bold');
  const [alignment, setAlignment] = useState('left');
  return (
    <AppContext.Provider value={{ colors, setColors, weight, setWeight, alignment, setAlignment }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook for easy usage
export const useAppContext = () => useContext(AppContext);