"use client";

export default function LoadingScreen() {
  return (
    <>
      <style>{`
        /* ── Fill: 8% → 100% over 4.8 s, cubic-bezier(0.22,1,0.36,1), repeat with 0.5 s delay ── */
        @keyframes fill-rise {
          0%   { height: 8%;   }
          100% { height: 100%; }
        }
        .fill-rise {
          animation: fill-rise 4.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          animation-delay: 0.5s;          /* acts as the repeatDelay for every cycle after the first  */
          animation-fill-mode: backwards; /* start at 8% even before first iteration fires            */
        }

        /* ── Wave 1 (wave.svg): x 0→-80px, y 0→-6→-15→0, 2.5 s linear, infinite ── */
        @keyframes wave-primary {
          0%          { transform: translateX(calc(-50% + 0px))  translateY(0px);   }
          33.33%      { transform: translateX(calc(-50% - 26px)) translateY(-6px);  }
          66.66%      { transform: translateX(calc(-50% - 53px)) translateY(-15px); }
          100%        { transform: translateX(calc(-50% - 80px)) translateY(0px);   }
        }
        .wave-primary {
          animation: wave-primary 2.5s linear infinite;
        }

        /* ── Wave 2 (waveM.svg): x 0→80px, y 0→-10→-30→0, 2.5 s linear, infinite ── */
        @keyframes wave-secondary {
          0%          { transform: translateX(calc(-50% + 0px))  translateY(0px);   }
          33.33%      { transform: translateX(calc(-50% + 26px)) translateY(-10px); }
          66.66%      { transform: translateX(calc(-50% + 53px)) translateY(-30px); }
          100%        { transform: translateX(calc(-50% + 80px)) translateY(0px);   }
        }
        .wave-secondary {
          animation: wave-secondary 2.5s linear infinite;
        }

        /* ── Shimmer overlay: x 0→6→-6→0, 2.8 s easeInOut, infinite ── */
        @keyframes shimmer-sway {
          0%   { transform: translateX(0px);  }
          33%  { transform: translateX(6px);  }
          66%  { transform: translateX(-6px); }
          100% { transform: translateX(0px);  }
        }
        .shimmer-sway {
          animation: shimmer-sway 2.8s cubic-bezier(0.42, 0, 0.58, 1) infinite;
        }
      `}</style>

      <div className="fixed bg-[#E6F1FD] inset-0 z-50 flex h-[100vh] w-[100vw] items-center justify-center overflow-hidden ">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-[110px] w-[110px]">
            {/* Outer ring gradient */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#DDE3FF] to-[#F7F9FF]" />

            {/* Inner clipping circle */}
            <div className="absolute inset-[5px] overflow-hidden rounded-full border border-[#D9E1FF] bg-[#F5F7FF] shadow-inner">

              {/* Rising fill wrapper */}
              <div
                className="fill-rise absolute inset-x-0 bottom-0 overflow-hidden"
                style={{ height: "8%" }} /* initial visible state before animation fires */
              >
                <div className="absolute inset-0 overflow-hidden">
                  {/* Wave 1 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/wave.svg"
                    alt="Loading Wave"
                    className="wave-primary absolute top-[-6px] z-10 h-[120px] w-[410px] max-w-none"
                    style={{ left: "50%", transform: "translateX(-50%)" }}
                  />

                  {/* Wave 2 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/waveM.svg"
                    alt="Loading Wave"
                    className="wave-secondary absolute top-[10px] z-20 h-[143px] w-[410px] max-w-none"
                    style={{ left: "50%", transform: "translateX(-50%)" }}
                  />
                </div>

                {/* Shimmer overlay */}
                <div
                  className="shimmer-sway absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.22),transparent_48%)]"
                />
              </div>

              {/* Specular highlight */}
              <div className="pointer-events-none absolute inset-x-[20%] top-[12%] h-[16px] rounded-full bg-white/20 blur-md" />
            </div>
          </div>

          {/* Text */}
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
    </>
  );
}