/**
 * Scan dashboard loading overlay — used by:
 * - `CookieScanDashboard` (initial load + Scan Now)
 * - `ConsentLogsDashboard` (consent history load)
 * - `ScheduleScanModal` (save schedule)
 *
 * z-[100] so it stacks above other dashboard modals (typically z-50).
 */
type LoadingPopupProps = {
  show: boolean;
  title?: string;
  subtitle?: string;
};

// export default function LoadingPopup({
//   show,
//   title = "Scanning...",
//   subtitle = "Please wait while we load data",
// }: LoadingPopupProps) {
//   if (!show) return null;
//   return (
//     <div
//       className="fixed inset-0 z-[100] flex items-center justify-center"
//       role="status"
//       aria-live="polite"
//       aria-busy="true"
//     >
//       <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
//       <div className="relative h-[302px] w-[503px]">
//         <div className="absolute h-full w-full rounded-[20px] bg-white shadow-lg">
//           <div className="absolute left-1/2 top-[58px] flex -translate-x-1/2 items-center gap-1">
//             <span className="h-2 w-2 animate-bounce rounded-full bg-[#18a0fb] [animation-delay:-0.2s]" />
//             <span className="h-2 w-2 animate-bounce rounded-full bg-[#18a0fb] [animation-delay:-0.1s]" />
//             <span className="h-2 w-2 animate-bounce rounded-full bg-[#18a0fb]" />
//           </div>
          
//           <div className="absolute left-1/2 top-[175px] -translate-x-1/2 text-center">
//             <p
//               className="mb-2 text-[16px] font-semibold leading-[20px] text-black"
//               style={{ fontVariationSettings: "'opsz' 14" }}
//             >
//               {title}
//             </p>
//             <p
//               className="text-[16px] font-normal leading-[normal] text-[#4b5563]"
//               style={{ fontVariationSettings: "'opsz' 14" }}
//             >
//               {subtitle}
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import imgImage5 from "@/public/images/loading.png";

 export default function LoadingPopup2({
  show,
  title = "Scanning...",
  subtitle = "Please wait while we load data",
}: LoadingPopupProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
      {/* Modal Container */}
      <div className="relative w-[320px] h-[200px]">
        <div className="absolute bg-white h-full w-full rounded-[16px] shadow-lg flex flex-col items-center justify-center gap-3">
          {/* Loading Animation */}
          <div className="relative w-[72px] h-[62px] rounded-[12px] overflow-hidden animate-pulse">
            <img
              alt="Loading animation"
              className="absolute max-w-none animate-spin"
              src={imgImage5.src}
              style={{ animationDuration: '2s', width: '72px', height: '72px' }}
            />
          </div>

          {/* Text Content */}
          <div className="text-center">
            <p className="font-semibold text-[14px] leading-[18px] text-black mb-1">
              {title}
            </p>
            <p className="font-normal text-[13px] leading-normal text-[#4b5563]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}