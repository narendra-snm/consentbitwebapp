"use client";
import { motion } from "motion/react";

export default function LoadingScreen() {
  return (
<div className="fixed bg-[#E6F1FD] inset-0 z-50 flex h-[100vh] w-[100vw] items-center justify-center overflow-hidden rounded-[24px]">      <div className="flex flex-col items-center gap-6">
        <div className="relative h-[110px] w-[110px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#DDE3FF] to-[#F7F9FF]" />

          <div className="absolute inset-[5px] overflow-hidden rounded-full border border-[#D9E1FF] bg-[#F5F7FF] shadow-inner">
            <motion.div
              className="absolute inset-x-0 bottom-0 overflow-hidden"
              initial={{ height: "8%" }}
              animate={{ height: "100%" }}
              transition={{
                duration: 4.8,
                ease: [0.22, 1, 0.36, 1],
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
            >
              <div className="absolute inset-0 overflow-hidden">
            <motion.img
  src="/images/wave.svg"
  alt="Loading Wave"
  className="absolute left-1/2 top-[-6px] z-10 h-[120px] w-[410px] max-w-none -translate-x-1/2"
  animate={{ x: [0, -80],y: [0, -6,-15, 0],  }}
  transition={{
    duration: 2.5,
    ease: "linear",
    repeat: Infinity,
  }}
/>
<motion.img
  src="/images/waveM.svg"
  alt="Loading Wave"
  className="absolute left-1/2 top-[10px] z-20 h-[143px] w-[410px] max-w-none -translate-x-1/2"
  animate={{ x: [0, 80], y: [0, -10,-30, 0], }}
  transition={{
    duration: 2.5,
    ease: "linear",
    repeat: Infinity,
  }}
/>
              </div>

              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.22),transparent_48%)]"
                animate={{ x: [0, 6, -6, 0] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            <div className="pointer-events-none absolute inset-x-[20%] top-[12%] h-[16px] rounded-full bg-white/20 blur-md" />
          </div>
        </div>

        <div className="text-center">
          <p
            className="font-['DM_Sans:SemiBold',sans-serif] text-[16px] font-semibold leading-[20px] tracking-[-0.4px] text-black"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Proceeding to payment...
          </p>
          <p
            className="mt-4 font-['DM_Sans:Regular',sans-serif] text-[14px] font-normal leading-[20px] tracking-[-0.2px] text-black/60"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            You will be redirected to Stripe shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
