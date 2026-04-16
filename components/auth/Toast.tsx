import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";
const svgPaths ={
p165fcb00: "M17.3643 4.11426C20.283 1.56701 24.635 1.56696 27.5537 4.11426C28.7468 5.15552 30.2482 5.7774 31.8281 5.88477C35.6931 6.14752 38.7706 9.2248 39.0332 13.0898C39.1406 14.6698 39.7624 16.1711 40.8037 17.3643C43.3508 20.283 43.3509 24.635 40.8037 27.5537C39.7624 28.7468 39.1406 30.2482 39.0332 31.8281C38.7705 35.6931 35.6931 38.7705 31.8281 39.0332C30.2482 39.1406 28.7468 39.7624 27.5537 40.8037C24.635 43.3509 20.283 43.3508 17.3643 40.8037C16.1711 39.7624 14.6698 39.1406 13.0898 39.0332C9.2248 38.7706 6.14752 35.6931 5.88477 31.8281C5.7774 30.2482 5.15552 28.7468 4.11426 27.5537C1.56696 24.635 1.56701 20.283 4.11426 17.3643C5.15554 16.1711 5.77739 14.6698 5.88477 13.0898C6.14742 9.22473 9.22473 6.14742 13.0898 5.88477C14.6698 5.77739 16.1711 5.15554 17.3643 4.11426Z",
p3f52ec80: "M26.2864 26.7663L18.2007 18.458",
p798e680: "M17.5286 4.30279C20.3532 1.83766 24.5645 1.83766 27.3891 4.30279C28.6234 5.37999 30.1765 6.02332 31.811 6.13439C35.5514 6.38857 38.5292 9.36637 38.7833 13.1068C38.8944 14.7412 39.5377 16.2944 40.6149 17.5286C43.0801 20.3532 43.0801 24.5645 40.6149 27.3891C39.5377 28.6234 38.8944 30.1765 38.7833 31.8109C38.5292 35.5514 35.5514 38.5292 31.811 38.7833C30.1765 38.8944 28.6234 39.5377 27.3891 40.6149C24.5645 43.0801 20.3532 43.0801 17.5286 40.6149C16.2944 39.5377 14.7412 38.8944 13.1068 38.7833C9.36637 38.5292 6.38857 35.5514 6.13439 31.8109C6.02332 30.1765 5.37999 28.6234 4.30279 27.3891C1.83766 24.5645 1.83766 20.3532 4.30279 17.5286C5.37999 16.2944 6.02332 14.7412 6.13439 13.1068C6.38857 9.36637 9.36637 6.38857 13.1068 6.13439C14.7412 6.02332 16.2944 5.37999 17.5286 4.30279Z",
}

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'error' | 'success';
  autoDismiss?: boolean;
  duration?: number;
}

export default function Toast({
  message,
  isVisible,
  onClose,
  type = 'error',
  autoDismiss = false,
  duration = 3000
}: ToastProps) {
  const isError = type === 'error';
  const isSuccess = type === 'success';
  useEffect(() => {
    if (isVisible && autoDismiss) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoDismiss, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed left-1/2 -translate-x-1/2 top-[20px] z-50"
          style={{ width: "834px", height: "83px" }}
        >
          <div className="relative size-full">
            {/* Background blur shadow */}
            <div
              className={`-translate-x-1/2 absolute blur-[17px] h-[70px] left-[calc(50%+0.5px)] opacity-50 rounded-[10px] top-[13px] w-[807px] ${
                isError ? 'bg-[#b63543]' : 'bg-[#22c55e]'
              }`}
            />

            {/* Main gradient background */}
            <div
              className={`-translate-x-1/2 absolute h-[70px] left-1/2 rounded-[10px] top-0 w-[834px] ${
                isError
                  ? 'bg-gradient-to-r from-[#b03240] from-[41.827%] to-[#ff6374] to-[98.077%]'
                  : 'bg-gradient-to-r from-[#16a34a] from-[41.827%] to-[#4ade80] to-[98.077%]'
              }`}
            />

            {/* Icon */}
            <div className="absolute left-[14px] size-[44.918px] top-[13px]">
              <div className="absolute inset-[0_-1.77%_-2.33%_0]">
                {isError ? (
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 45.7138 45.9638">
                    <g id="Group 10123394">
                      <g filter="url(#filter0_d_27_37)" id="Star 12">
                        <path d={svgPaths.p798e680} fill="url(#paint0_radial_27_37)" />
                        <path d={svgPaths.p798e680} fill="var(--fill-1, #E9969F)" />
                        <path d={svgPaths.p165fcb00} stroke="var(--stroke-0, black)" strokeWidth="0.5" />
                      </g>
                      <path d="M18 26.5611L26.4871 18.6632" id="Vector 2" stroke="var(--stroke-0, #AC2734)" strokeLinecap="round" strokeWidth="2" />
                      <path d={svgPaths.p3f52ec80} id="Vector 3" stroke="var(--stroke-0, #AC2734)" strokeLinecap="round" strokeWidth="2" />
                    </g>
                    <defs>
                      <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="44.0098" id="filter0_d_27_37" width="43.7598" x="1.95394" y="1.95394">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dx="2.75" dy="3" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
                        <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_27_37" />
                        <feBlend in="SourceGraphic" in2="effect1_dropShadow_27_37" mode="normal" result="shape" />
                      </filter>
                      <radialGradient cx="0" cy="0" gradientTransform="translate(13.257 9.04593) rotate(49.4258) scale(35.7281)" gradientUnits="userSpaceOnUse" id="paint0_radial_27_37" r="1">
                        <stop stopColor="#062E6F" />
                        <stop offset="1" stopColor="#04409F" />
                      </radialGradient>
                    </defs>
                  </svg>
                ) : (
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 45.7138 45.9638">
                    <g>
                      <g filter="url(#filter0_d_success)" id="Star 12">
                        <path d={svgPaths.p798e680} fill="url(#paint0_radial_success)" />
                        <path d={svgPaths.p798e680} fill="var(--fill-1, #86efac)" />
                        <path d={svgPaths.p165fcb00} stroke="var(--stroke-0, black)" strokeWidth="0.5" />
                      </g>
                      <path d="M17 23L21 27L28 18" stroke="var(--stroke-0, #16a34a)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                    </g>
                    <defs>
                      <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="44.0098" id="filter0_d_success" width="43.7598" x="1.95394" y="1.95394">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                        <feOffset dx="2.75" dy="3" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
                        <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_success" />
                        <feBlend in="SourceGraphic" in2="effect1_dropShadow_success" mode="normal" result="shape" />
                      </filter>
                      <radialGradient cx="0" cy="0" gradientTransform="translate(13.257 9.04593) rotate(49.4258) scale(35.7281)" gradientUnits="userSpaceOnUse" id="paint0_radial_success" r="1">
                        <stop stopColor="#065f46" />
                        <stop offset="1" stopColor="#059669" />
                      </radialGradient>
                    </defs>
                  </svg>
                )}
              </div>
            </div>

            {/* Message text */}
            <p className="absolute font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[20px] left-[72px] text-[18px] text-white top-[25px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
              {message}
            </p>

            {/* Close button */}
            <button
              onClick={(e) =>{ 
                e.preventDefault();
                onClose()}}
              className="absolute bg-[#f1f5f9] content-center flex flex-wrap gap-y-[4px] h-[36px] items-center justify-center left-[742px] px-[11px] py-[8px] rounded-[8px] top-[17px] w-[76px] cursor-pointer hover:bg-[#e2e8f0] transition-colors"
            >
              <p
                className={`font-['DM_Sans:Medium',sans-serif] font-medium leading-[20px] relative shrink-0 text-[12px] whitespace-nowrap ${
                  isError ? 'text-[#b03240]' : 'text-[#16a34a]'
                }`}
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Close
              </p>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
