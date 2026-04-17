
import Link from "next/link";

import BouncyIcon from "./ui/BouncyIcon"
import CookieAnimation from "./ui/CookieAnimation";
import CircularArrow from "./ui/CircularArrow";


export default function SiteSummaryCards({
  site,
  onOpenInstall,
}: {
  site?: any | null;
  onOpenInstall?: () => void;
}) {
  const siteId = site?.id ? String(site.id) : null;
  const formatDate = (value: any) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  const displayName = site?.name || site?.domain || "—";
  const isVerified = site?.verified === 1 || site?.verified === true;
  const bannerType = (() => {
    const raw = String(site?.banner_type ?? site?.bannerType ?? "").trim().toLowerCase();
    if (raw === "iab") return "IAB";
    if (raw === "ccpa") return "CCPA";
    if (raw === "gdpr") return "GDPR";
    // Some rows may not have banner_type yet; default to GDPR so the card never renders blank.
    return "GDPR";
  })();
  const regionMode =
    site?.region_mode === "both"
      ? "GDPR + CCPA"
      : site?.region_mode === "ccpa"
        ? "CCPA"
        : site?.region_mode === "gdpr"
          ? "GDPR"
          : "—";
  const createdLabel = formatDate(site?.createdAt);
  const updatedLabel = formatDate(site?.updatedAt);

  const pagesScannedDisplay = (() => {
    const raw = site?.pagesScanned;
    if (raw === null || raw === undefined || raw === "") return "—";
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? String(n) : "—";
  })();

  return (
    <div className="grid grid-cols-2 gap-6 mt-4">

      {/* LEFT CARD */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">

        {/* Header */}
        <div className="flex items-center gap-2 mb-3.25 font-medium">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-globe"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
  {displayName}
</div>

        <div className="grid grid-cols-4 gap-4 items-start">

          {/* Status Box */}
          <div
            className={`${isVerified ? "bg-[#ECFDF3]" : "bg-[#FFEFEF]"} col-span-2 rounded-lg py-3.75 px-3.5`}
          >
            <div className="flex gap-3">
            <div className={`mt-1  ${isVerified ? "text-emerald-600" : "text-[#AC2734]"}`}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="40" height="40" rx="8" fill="white"/>
<path d="M29.598 19.064C29.4777 18.9732 29.3384 18.9105 29.1906 18.8808C29.0428 18.851 28.8902 18.8548 28.744 18.892C28.5017 18.9597 28.2516 18.996 28 19C26.346 19 25 17.654 24.997 16.063C25.002 16.029 25.013 15.927 25.014 15.893C25.0205 15.7367 24.9902 15.581 24.9255 15.4385C24.8608 15.2961 24.7634 15.1708 24.6414 15.0729C24.5193 14.975 24.376 14.9072 24.2229 14.8749C24.0698 14.8426 23.9112 14.8467 23.76 14.887C23.5127 14.9575 23.2572 14.9955 23 15C21.346 15 20 13.654 20 12C20 11.783 20.031 11.556 20.099 11.284C20.1375 11.1287 20.1382 10.9665 20.101 10.8109C20.0638 10.6553 19.9899 10.511 19.8854 10.3899C19.7808 10.2688 19.6488 10.1746 19.5003 10.1151C19.3518 10.0556 19.1912 10.0326 19.032 10.048C16.5555 10.2788 14.255 11.4283 12.5835 13.2701C10.9119 15.1119 9.99028 17.5127 10 20C10 25.514 14.486 30 20 30C25.514 30 30 25.514 30 20C30 19.951 29.997 19.903 29.993 19.84C29.9897 19.6893 29.9524 19.5413 29.884 19.4069C29.8156 19.2726 29.7179 19.1554 29.598 19.064ZM20 28C15.589 28 12 24.411 12 20C11.9929 18.2233 12.5802 16.4952 13.6686 15.0908C14.7569 13.6865 16.2837 12.6865 18.006 12.25C18.0716 13.5307 18.6262 14.7375 19.5554 15.6213C20.4846 16.5051 21.7176 16.9986 23 17L23.101 16.999C23.3305 18.1172 23.9352 19.1235 24.8149 19.851C25.6947 20.5785 26.7966 20.9835 27.938 20.999C27.444 24.941 24.073 28 20 28Z" fill="currentColor"/>
<path d="M20.5 21C21.3284 21 22 20.3284 22 19.5C22 18.6716 21.3284 18 20.5 18C19.6716 18 19 18.6716 19 19.5C19 20.3284 19.6716 21 20.5 21Z" fill="currentColor"/>
<path d="M16.5 18C17.3284 18 18 17.3284 18 16.5C18 15.6716 17.3284 15 16.5 15C15.6716 15 15 15.6716 15 16.5C15 17.3284 15.6716 18 16.5 18Z" fill="currentColor"/>
<path d="M15.5 22C16.3284 22 17 21.3284 17 20.5C17 19.6716 16.3284 19 15.5 19C14.6716 19 14 19.6716 14 20.5C14 21.3284 14.6716 22 15.5 22Z" fill="currentColor"/>
<path d="M23.5 25C24.3284 25 25 24.3284 25 23.5C25 22.6716 24.3284 22 23.5 22C22.6716 22 22 22.6716 22 23.5C22 24.3284 22.6716 25 23.5 25Z" fill="currentColor"/>
<path d="M18.5 26C19.3284 26 20 25.3284 20 24.5C20 23.6716 19.3284 23 18.5 23C17.6716 23 17 23.6716 17 24.5C17 25.3284 17.6716 26 18.5 26Z" fill="currentColor"/>
</svg>

            </div>
            <div>
            <p className="text-sm ">Cookie banner status</p>

            <p className={`font-medium text-xl mt-1 flex items-center gap-1 ${isVerified ? "text-emerald-600" : "text-[#AC2734]"}`}>
              {isVerified ? "Active" : "Inactive"} <CircularArrow/>

            </p>
</div>
</div>
            <p className="text-sm flex gap-1 mt-4.5">
              <svg className="mt-0.5" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.25 2.91667H6.41667V7H5.25V2.91667ZM5.25 7.58333H6.41667V8.75H5.25V7.58333Z" fill="black"/>
<path d="M11.4958 3.08758L8.57908 0.170917C8.52501 0.116642 8.46073 0.0735995 8.38995 0.0442665C8.31917 0.0149334 8.24328 -0.000110512 8.16667 6.11143e-07H3.5C3.42338 -0.000110512 3.3475 0.0149334 3.27672 0.0442665C3.20594 0.0735995 3.14166 0.116642 3.08758 0.170917L0.170917 3.08758C0.116642 3.14166 0.0735995 3.20594 0.0442665 3.27672C0.0149334 3.3475 -0.000110512 3.42338 6.11143e-07 3.5V8.16667C6.11143e-07 8.32183 0.0612506 8.47 0.170917 8.57908L3.08758 11.4958C3.14166 11.55 3.20594 11.5931 3.27672 11.6224C3.3475 11.6517 3.42338 11.6668 3.5 11.6667H8.16667C8.32183 11.6667 8.47 11.6054 8.57908 11.4958L11.4958 8.57908C11.55 8.52501 11.5931 8.46073 11.6224 8.38995C11.6517 8.31917 11.6668 8.24328 11.6667 8.16667V3.5C11.6668 3.42338 11.6517 3.3475 11.6224 3.27672C11.5931 3.20594 11.55 3.14166 11.4958 3.08758ZM10.5 7.92517L7.92517 10.5H3.7415L1.16667 7.92517V3.7415L3.7415 1.16667H7.92517L10.5 3.7415V7.92517Z" fill="black"/>
</svg>

              {isVerified ? (
                <>Installation verified</>
              ) : (
                <>
                  Looks like your Installation<br /> code not added yet
                </>
              )}
            </p>

            <button
              type="button"
              onClick={onOpenInstall}
              className="text-[#007AFF] text-sm  font-medium mt-3.5"
            >
              Get your installation code ↓
            </button>
            </div>
         

          {/* Banner Type */}
          <div>
            <p className="text-sm text-[#4B5563]">Banner Type</p>
            <p className=" font-medium  mt-1">
              {bannerType}
            </p>

            
            <p className="text-sm text-[#4B5563] mt-8.5">Created</p>
            <p className=" font-medium  mt-1">
              {createdLabel}
            </p>
          </div>

          {/* Created */}
          <div>
            <p className="text-sm text-[#4B5563]">Region Mode</p>
            <p className=" font-medium  mt-1">
             {regionMode}
            </p>

           <p className="text-sm text-[#4B5563] mt-8.5">Last Updated</p>
            <p className=" mt-1 font-medium ">
              {updatedLabel}
            </p>
          </div>
          

        </div>

        {/* Footer */}
        <Link
          href={siteId ? `/dashboard/${siteId}/cookie-banner` : "/dashboard"}
          className="mt-2.25 bg-[#EEF4FB] rounded-lg py-6 px-3.5 flex items-center justify-between"
        >
          <span className="text-[#007AFF] text-sm ">
            Customize cookie banner
          </span>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="18"
  height="18"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="lucide lucide-arrow-right text-blue-600"
  aria-hidden="true"
>
  <path d="M5 12h14" />
  <path d="m12 5 7 7-7 7" />
</svg>
        </Link>
      </div>

      {/* RIGHT CARD */}
    {/* RIGHT CARD */}
<div className="bg-white border border-gray-200 rounded-xl p-5">

  {/* Header */}
  <h3 className=" font-semibold  mb-3.25">
   Summary
  </h3>

  <div className="grid grid-cols-2 gap-4">

    {/* BLUE STATS CARD */}
    <div className={`bg-[#EEF4FB] ${ isVerified ? "min-h-[144px]":"min-h-[160px]"}  rounded-lg py-3.75 px-3.5 flex flex-col justify-between`}>

      {/* Icons */}
      <div className="flex mb-4">
  <div className="w-1/2 flex justify-start">
    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
      {/* <img src="/images/coookie.png" alt="Verification" className="mt-1" /> */}
      <CookieAnimation/>
    </div>
  </div>

  <div className="w-1/2 flex justify-start ">
    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
      {/* <img src="/images/menu.png" alt="Verification" className="mt-1" /> */}
      <BouncyIcon/>
    </div>
  </div>
</div>

      {/* Stats */}
      <div className="flex mt-2 pl-2">
  <div className="w-1/2">
    <p className="text-[22px] font-semibold text-gray-800">
      {site?.cookieCount ?? "—"}
    </p>
    <p className="text-sm text-[#4B5563]">
      Total cookies
    </p>
  </div>

  <div className="w-1/2">
    <p className="text-[22px] font-semibold text-gray-800">
      {site?.cookieCategories ?? "—"}
    </p>
    <p className="text-sm text-[#4B5563]">
      Categories
    </p>
  </div>
</div>

    </div>

    {/* Scan info */}
    <div className="text-sm text-gray-600 flex flex-col justify-between">

      <div>
        <p className="text-[#4B5563]">Last successful scan</p>
        <p className="mt-1 text-sm text-[#161616] font-medium">
          {updatedLabel}
        </p>
      </div>

      <div>
        <p className="text-[#4B5563]">Pages scanned</p>
        <p className="mt-1 text-sm text-[#161616] font-medium">
          {pagesScannedDisplay}
        </p>
      </div>

      <div>
        <p className="text-[#4B5563]">Next scan</p>
        <p className="mt-1 text-sm text-[#161616]">
          Not scheduled{" "}
          <Link href={siteId ? `/dashboard/${siteId}/scan` : "/dashboard"} className="text-[#007AFF] underline hover:underline">
            Schedule Now
          </Link>
        </p>
      </div>

    </div>

  </div>

  {/* Footer */}
  <Link
    href={siteId ? `/dashboard/${siteId}/scan` : "/dashboard"}
    className="mt-2.25 bg-[#EEF4FB] rounded-lg py-6 px-3.5 flex items-center justify-between"
  >
    <span className="text-[#007AFF] text-sm ">
      Manage cookies
    </span>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="18"
  height="18"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  className="lucide lucide-arrow-right text-blue-600"
  aria-hidden="true"
>
  <path d="M5 12h14" />
  <path d="m12 5 7 7-7 7" />
</svg>
  </Link>

</div>

    </div>
  );
}