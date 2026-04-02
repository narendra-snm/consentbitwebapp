"use client";

import { useEffect, useState } from "react";

const cookies = [
  "/images/1.svg",
  "/images/2.svg",
  "/images/3.svg",
  "/images/4.svg",
  "/images/5.svg",
];

export default function CookieAnimation() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % cookies.length);
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-10 h-10">
      {cookies.map((src, i) => (
        <img
          key={i}
          src={src}
          className={`
            absolute top-1/2 left-1/2
            w-6 h-6
            -translate-x-1/2 -translate-y-1/2
            transition-all duration-300 ease-in-out
            ${i === index ? "opacity-100 scale-100" : "opacity-0 scale-90"}
          `}
        />
      ))}
    </div>
  );
}