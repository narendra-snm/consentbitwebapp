import { Globe, ArrowRight } from "lucide-react";
import Link from "next/link";

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
  const bannerType =
    site?.banner_type === "ccpa" ? "CCPA" : site?.banner_type === "gdpr" ? "GDPR" : "—";
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
        <div className="flex items-center gap-2 mb-3.25  font-medium ">
          <Globe size={16} />
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
            <p className="text-xs ">Cookie banner status</p>

            <p className={`font-medium text-xl mt-1 flex items-center gap-1 ${isVerified ? "text-emerald-600" : "text-[#AC2734]"}`}>
              {isVerified ? "Active" : "Inactive"} <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.86102e-05 8.10511C-0.00238037 7.33074 0.151782 6.56362 0.453565 5.84827C0.755347 5.13291 1.19874 4.48358 1.758 3.93797C2.69762 3.01009 3.92752 2.41963 5.24995 2.26153V0L8.9999 2.94758L5.24995 5.89516V3.75006C4.32834 3.8996 3.47782 4.32981 2.81849 4.97994C2.39913 5.38933 2.06666 5.87644 1.84033 6.41303C1.614 6.94962 1.49832 7.52501 1.50001 8.10585V8.10732C1.50001 8.35049 1.52476 8.58999 1.56451 8.82727C1.56976 8.85895 1.57276 8.89211 1.57876 8.9238C1.71186 9.60334 2.00406 10.2431 2.43224 10.7926C2.55224 10.9466 2.68049 11.0962 2.81924 11.2325C2.98868 11.3971 3.17126 11.5482 3.36523 11.6842C3.87382 12.0501 4.45603 12.3051 5.07296 12.4322C5.17946 12.4543 5.2867 12.469 5.39545 12.483C5.44195 12.4896 5.48695 12.4985 5.53345 12.5029C6.00907 12.5508 6.48938 12.5252 6.95693 12.427L7.27493 13.8676C6.65075 13.9991 6.00936 14.0329 5.37445 13.9678C5.3227 13.9627 5.27095 13.9524 5.2192 13.9457C5.06546 13.9266 4.91246 13.9045 4.76171 13.8735L4.72196 13.8669L4.72271 13.8632C4.16264 13.7453 3.623 13.5479 3.12073 13.2774L3.09898 13.2641C2.834 13.1188 2.58076 12.9538 2.34149 12.7704C2.139 12.6164 1.9425 12.4535 1.75875 12.273C1.57275 12.091 1.40626 11.895 1.24801 11.6945C1.23226 11.6739 1.21126 11.6555 1.19551 11.6348L1.20001 11.6319C0.855879 11.1828 0.579766 10.6872 0.380274 10.1603L0.374274 10.1625C0.352524 10.105 0.336774 10.0461 0.317274 9.98787C0.289525 9.90682 0.261024 9.82502 0.237025 9.74249C0.207026 9.63932 0.182276 9.53542 0.158277 9.43078C0.141777 9.35783 0.122277 9.28709 0.108778 9.2134C0.0847778 9.08739 0.0667782 8.95991 0.0517778 8.83316C0.0442781 8.77716 0.0345278 8.72263 0.0292778 8.66589C0.0120287 8.4824 0.00152969 8.29744 0.00152969 8.111C0.00152969 8.111 2.86102e-05 8.10806 2.86102e-05 8.10511ZM9.60214 10.7565L10.8021 11.6415C10.286 12.3166 9.62915 12.8756 8.8754 13.2811L8.15466 11.9885C8.7213 11.6843 9.21491 11.2642 9.60214 10.7565ZM10.4999 8.10585C10.4999 7.999 10.4961 7.89436 10.4886 7.78972L11.9841 7.68434C12.0469 8.52858 11.9233 9.37617 11.6219 10.1692L10.2171 9.65259C10.405 9.15784 10.5008 8.63391 10.4999 8.10585Z" fill="#007AFF"/>
</svg>

            </p>
</div>
</div>
            <p className="text-xs flex gap-1 mt-4.5">
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
              className="text-[#007AFF] text-xs  font-medium mt-3.5"
            >
              Get your installation code ↓
            </button>
            </div>
         

          {/* Banner Type */}
          <div>
            <p className="text-xs text-[#4B5563]">Banner Type</p>
            <p className=" font-medium  mt-1">
              {bannerType}
            </p>

            
            <p className="text-xs text-[#4B5563] mt-8.5">Created</p>
            <p className=" font-medium  mt-1">
              {createdLabel}
            </p>
          </div>

          {/* Created */}
          <div>
            <p className="text-xs text-[#4B5563]">Region Mode</p>
            <p className=" font-medium  mt-1">
             {regionMode}
            </p>

           <p className="text-xs text-[#4B5563] mt-8.5">Last Updated</p>
            <p className=" mt-1 ">
              {updatedLabel}
            </p>
          </div>
          

        </div>

        {/* Footer */}
        <Link
          href={siteId ? `/dashboard/${siteId}/cookie-banner` : "/dashboard"}
          className="mt-2.25 bg-[#EEF4FB] rounded-lg py-6 px-3.5 flex items-center justify-between"
        >
          <span className="text-[#007AFF] text-sm font-medium">
            Customize cookie banner
          </span>

          <ArrowRight size={18} className="text-blue-600" />
        </Link>
      </div>

      {/* RIGHT CARD */}
    {/* RIGHT CARD */}
<div className="bg-white border border-gray-200 rounded-xl p-5">

  {/* Header */}
  <h3 className=" font-semibold  mb-3.25">
    Cookie summary
  </h3>

  <div className="grid grid-cols-2 gap-4">

    {/* BLUE STATS CARD */}
    <div className="bg-[#EEF4FB] min-h-[160px]  rounded-lg py-3.75 px-3.5 flex flex-col justify-between">

      {/* Icons */}
      <div className="flex justify-between mb-4">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <img src="/images/coookie.png" alt="Verification" className="mt-1" />

        </div>

        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <img src="/images/menu.png" alt="Verification" className="mt-1" />

        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between mt-2">
        <div>
          <p className="text-2xl font-semibold text-gray-800">
            {site?.cookieCount ?? "—"}
          </p>
          <p className="text-xs text-gray-500">
            Total cookies
          </p>
        </div>

        <div>
          <p className="text-2xl font-semibold text-gray-800">
            {site?.cookieCategories ?? "—"}
          </p>
          <p className="text-xs text-gray-500">
            Categories
          </p>
        </div>
      </div>

    </div>

    {/* Scan info */}
    <div className="text-xs text-gray-600 flex flex-col justify-between">

      <div>
        <p className="text-[#4B5563]">Last successful scan</p>
        <p className="mt-1 text-sm text-[#161616]">
          {updatedLabel}
        </p>
      </div>

      <div>
        <p className="text-[#4B5563]">Pages scanned</p>
        <p className="mt-1 text-sm text-[#161616]">
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

    <ArrowRight size={18} className="text-blue-600" />
  </Link>

</div>

    </div>
  );
}