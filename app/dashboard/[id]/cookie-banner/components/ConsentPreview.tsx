"use client";

import { useEffect, useMemo, useState } from "react";
import { getBannerLanguage, getTranslation } from "./translations";
import { useAppContext } from "@/app/context/AppProvider";

export default function ConsentPreview({
  previewBannerType,
  siteDomain,
  consentType,
}: {
  previewBannerType?: "gdpr" | "ccpa";
  siteDomain?: string | null;
  consentType?: "gdpr" | "ccpa" | "both";
}) {
  // Avoid unused prop warnings in strict TS configs.
  void siteDomain;
  const { colors, setColors,weight, setWeight,alignment, setAlignment } = useAppContext();

  const isFreeForced = Boolean(previewBannerType);

  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  // For free-plan selection, dropdown already forces previewBannerType.
  // For "both" (non-free), allow switching using the preview tabs.
  const [activeBothType, setActiveBothType] = useState<"gdpr" | "ccpa">("gdpr");

  const selectedBannerType: "gdpr" | "ccpa" = useMemo(() => {
    if (previewBannerType) return previewBannerType;
    if (consentType === "ccpa") return "ccpa";
    if (consentType === "both") return activeBothType;
    return "gdpr";
  }, [previewBannerType, consentType, activeBothType]);

  const lang = useMemo(
    () => getBannerLanguage({ autoDetectLanguage: true }),
    [],
  );
  const t = useMemo(() => (key: string) => getTranslation(lang, key), [lang]);

  type ModalView = "main" | "gdpr-preferences" | "ccpa-optout";
  const [modalView, setModalView] = useState<ModalView>("main");

  useEffect(() => {
    // When the banner selection changes, reset to main preview.
    setModalView("main");
  }, [selectedBannerType]);

  const openPreferences = () => {
    setModalView(
      selectedBannerType === "gdpr" ? "gdpr-preferences" : "ccpa-optout",
    );
  };

  const getDeviceFrameClasses = () => {
    switch (device) {
      case "tablet":
        return "w-[768px] max-w-full h-[500px]";
      case "mobile":
        return "w-[390px] max-w-full h-[680px]";
      default:
        return "w-full h-[444px]";
    }
  };

  return (
    <div className="w-full px-4.5">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-4 mt-4.5">
        {/* Free user: show ONLY selected tab based on dropdown selection. */}
        {isFreeForced ? (
          <div className="flex items-center gap-4">
            <div
              className={`h-[30px] rounded-t-md px-3 flex items-center bg-[#edeefc] border-b-2 border-[#007aff]`}
              aria-label={
                selectedBannerType === "gdpr" ? "GDPR tab" : "CCPA tab"
              }
            >
              <p className="font-medium text-base text-[#007aff]">
                {selectedBannerType === "gdpr" ? "GDPR" : "CCPA"}
              </p>
            </div>
          </div>
        ) : consentType === "both" ? (
          // Non-free: allow switching between GDPR and CCPA inside preview.
          <div className="flex items-center gap-4">
            <button
              type="button"
              className={`h-[30px] rounded-t-md px-3 flex items-center ${
                selectedBannerType === "gdpr"
                  ? "bg-[#edeefc] border-b-2 border-[#007aff]"
                  : "text-[#007aff]"
              }`}
              aria-label="GDPR tab"
              onClick={() => {
                if (consentType === "both") setActiveBothType("gdpr");
                setModalView("main");
              }}
            >
              <p className="font-medium text-base text-[#007aff]">GDPR</p>
            </button>
            <button
              type="button"
              className={`h-[30px] rounded-t-md px-3 flex items-center ${
                selectedBannerType === "ccpa"
                  ? "bg-[#edeefc] border-b-2 border-[#007aff]"
                  : "text-[#111827]"
              }`}
              aria-label="CCPA tab"
              onClick={() => {
                if (consentType === "both") setActiveBothType("ccpa");
                setModalView("main");
              }}
            >
              <p className="font-medium text-base text-[#007aff]">CCPA</p>
            </button>
          </div>
        ) : (
          // Non-free with single regulation: show one tab.
          <div className="flex items-center gap-4">
            <div
              className={`h-[30px] rounded-t-md px-3 flex items-center bg-[#edeefc] border-b-2 border-[#007aff]`}
              aria-label={
                selectedBannerType === "gdpr" ? "GDPR tab" : "CCPA tab"
              }
            >
              <p className="font-medium text-base text-[#007aff]">
                {selectedBannerType === "gdpr" ? "GDPR" : "CCPA"}
              </p>
            </div>
          </div>
        )}

        {/* Right Side Buttons */}
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 flex items-center justify-center border border-[#e5e5e5] rounded-lg bg-[#f9f9fa] hover:bg-gray-100 transition-colors">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0.5"
                y="0.5"
                width="35"
                height="35"
                rx="7.5"
                fill="#F9F9FA"
              />
              <rect
                x="0.5"
                y="0.5"
                width="35"
                height="35"
                rx="7.5"
                stroke="#E5E5E5"
              />
              <path
                d="M12.75 24.75H23.25C23.6478 24.75 24.0294 24.592 24.3107 24.3107C24.592 24.0294 24.75 23.6478 24.75 23.25V15C24.7506 14.9013 24.7317 14.8035 24.6943 14.7121C24.657 14.6207 24.602 14.5376 24.5325 14.4675L21.5325 11.4675C21.4624 11.398 21.3793 11.343 21.2879 11.3057C21.1966 11.2684 21.0987 11.2494 21 11.25H12.75C12.3522 11.25 11.9706 11.408 11.6893 11.6894C11.408 11.9707 11.25 12.3522 11.25 12.75V23.25C11.25 23.6478 11.408 24.0294 11.6893 24.3107C11.9706 24.592 12.3522 24.75 12.75 24.75ZM20.25 23.25H15.75V19.5H20.25V23.25ZM18.75 14.25H17.25V12.75H18.75V14.25ZM12.75 12.75H14.25V15.75H20.25V12.75H20.6925L23.25 15.3075V23.25H21.75V19.5C21.75 19.1022 21.592 18.7207 21.3107 18.4394C21.0294 18.158 20.6478 18 20.25 18H15.75C15.3522 18 14.9706 18.158 14.6893 18.4394C14.408 18.7207 14.25 19.1022 14.25 19.5V23.25H12.75V12.75Z"
                fill="#4B5563"
              />
            </svg>
          </button>

          <button className="px-4 h-9 bg-[#2ec04f] text-white text-sm rounded-lg hover:bg-[#26a342] transition-colors">
            Publish Changes
          </button>

          <button className="px-4 h-9 bg-[#007aff] text-white text-sm rounded-lg hover:bg-[#0066d6] transition-colors">
            Next
          </button>
        </div>
      </div>

      {/* Browser Preview */}
      <div
        className={`${getDeviceFrameClasses()} rounded-md overflow-hidden shadow-lg flex flex-col mx-auto`}
      >
        {/* Browser Header */}
        <div className="h-[24px] bg-[#d9d9d9] opacity-50 flex items-center px-2 gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>

        {/* Preview Area */}
        <div className="relative bg-gray-100 flex-1 flex items-end p-6">
          {modalView === "main" && (
            <div
              className="bg-white rounded-md shadow-lg w-full max-w-[360px] p-4"
              style={{ backgroundColor: colors.bannerBg }}
            >
              <p
                style={{ color: colors.headingColor, textAlign: alignment  }}
                className="font-semibold text-[13px] text-black opacity-80 tracking-tight mb-2"
              >
                {selectedBannerType === "ccpa" ? t("title") : t("title")}
              </p>

              <p
                style={{ color: colors.textColor, textAlign: alignment  }}
                className="text-[11px] text-black opacity-80 tracking-tight mb-3"
              >
                {selectedBannerType === "ccpa"
                  ? t("ccpaDescription")
                  : t("description")}
              </p>

              <div className="flex gap-2" style={{justifyContent:`${alignment==="right"?"flex-end":alignment==="center"?"center":"flex-start"}`}}>
                <button
                  className="px-3 py-[2px] border border-[#007aff] text-[10px] text-[#007aff]"
                  onClick={openPreferences}
                  type="button"
                  style={{
                    backgroundColor: colors.buttonColor,
                    color: colors.buttonTextColor,
                    borderColor: colors.buttonTextColor,
                  }}
                >
                  {t("preferences")}
                </button>

                {selectedBannerType === "ccpa" ? (
                  <button
                    className="px-3 py-[2px] bg-[#007aff] text-[10px] text-white"
                    type="button"
                  >
                    {t("doNotSell")}
                  </button>
                ) : (
                  <button
                    style={{
                      backgroundColor: colors.SecButtonColor,
                      color: colors.SecButtonTextColor,
                    }}
                    className="px-3 py-[2px] bg-[#007aff] text-[10px] text-white"
                    type="button"
                  >
                    {t("rejectAll")}
                  </button>
                )}

                <button
                style={{
    backgroundColor: colors.SecButtonColor,
    color: colors.SecButtonTextColor,
    
  }}
                  className="px-3 py-[2px] bg-[#007aff] text-[10px] text-white"
                  type="button"
                >
                  {t("acceptAll") || "Ok, Got it"}
                </button>
              </div>
            </div>
          )}

          {modalView === "gdpr-preferences" && (
            <div style={{background:colors.bannerBg}} className="absolute bottom-[58px] left-1/2 -translate-x-1/2 bg-white rounded-md shadow-lg w-full max-w-[360px] p-4">
              <div className="flex items-center justify-between mb-3">
                <p style={{ color: colors.headingColor, textAlign: alignment  }} className="font-semibold text-[13px] text-black opacity-80 tracking-tight">
                  {t("cookiePreferences")}
                </p>
                <button
                  className="text-black opacity-70"
                  type="button"
                  onClick={() => setModalView("main")}
                  aria-label="Close preferences"
                >
                  ×
                </button>
              </div>

              <p style={{ color: colors.textColor, textAlign: alignment  }}  className="text-[11px] text-black opacity-80 tracking-tight mb-3">
                {t("managePreferences")}
              </p>

              <div className="space-y-2">
                {[
                  { key: "necessary", locked: true },
                  { key: "functional", locked: false },
                  { key: "analytics", locked: false },
                  { key: "performance", locked: false },
                  { key: "advertisement", locked: false },
                ].map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span style={{ color: colors.textColor, textAlign: alignment  }} className="text-black opacity-80">{t(c.key)}</span>
                    <input
                      type="checkbox"
                      defaultChecked={c.locked}
                      disabled={c.locked}
                    />
                  </label>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                 style={{
                    backgroundColor: colors.buttonColor,
                    color: colors.buttonTextColor,
                    borderColor: colors.buttonTextColor,
                  }}
                  className="flex-1 px-3 py-[6px] border border-[#e5e5e5] text-[11px] text-[#111827] rounded"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {t("rejectAll")}
                </button>
                <button
                  style={{
                    backgroundColor: colors.SecButtonColor,
                    color: colors.SecButtonTextColor,
                    
                  }}
                  className="flex-1 px-3 py-[6px] bg-[#007aff] text-[11px] text-white rounded"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {t("save")}
                </button>
              </div>
            </div>
          )}

          {modalView === "ccpa-optout" && (
            <div style={{ background: colors.bannerBg  }} className="absolute bottom-[58px] left-1/2 -translate-x-1/2 bg-white rounded-md shadow-lg w-full max-w-[360px] p-4">
              <div className="flex items-center justify-between mb-3">
                <p style={{ color: colors.headingColor, textAlign: alignment  }} className="font-semibold text-[13px] text-black opacity-80 tracking-tight">
                  {t("doNotSell")}
                </p>
                <button
                  className="text-black opacity-70"
                  type="button"
                  onClick={() => setModalView("main")}
                  aria-label="Close opt-out"
                >
                  ×
                </button>
              </div>

              <p style={{ color: colors.textColor, textAlign: alignment  }} className="text-[11px] text-black opacity-80 tracking-tight mb-3">
                {t("ccpaOptOut")}
              </p>

              <label className="flex items-center justify-between text-[11px] mb-3">
                <span style={{ color: colors.textColor, textAlign: alignment  }} className="text-black opacity-80">{t("limitUse")}</span>
                <input type="checkbox" defaultChecked />
              </label>

              <div className="flex gap-2">
                <button
                 style={{
                    backgroundColor: colors.buttonColor,
                    color: colors.buttonTextColor,
                    borderColor: colors.buttonTextColor,
                  }}
                  className="flex-1 px-3 py-[6px] border border-[#e5e5e5] text-[11px] text-[#111827] rounded"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {t("cancel")}
                </button>
                <button
                 style={{
                    backgroundColor: colors.SecButtonColor,
                    color: colors.SecButtonTextColor,
                    
                  }}
                  className="flex-1 px-3 py-[6px] bg-[#007aff] text-[11px] text-white rounded"
                  type="button"
                  onClick={() => setModalView("main")}
                >
                  {t("confirmChoice")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device Selector */}
      <div className="flex gap-6 mt-6 items-center">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setDevice("mobile")}
        >
          <div
            className="w-[10px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === "mobile" ? "#007aff" : "#4B5563",
            }}
          />
          <p
            className="text-base"
            style={{ color: device === "mobile" ? "#007aff" : "#6B7280" }}
          >
            Phone
          </p>
        </button>
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setDevice("tablet")}
        >
          <div
            className="w-[16px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === "tablet" ? "#007aff" : "#4B5563",
            }}
          />
          <p
            className="text-base"
            style={{ color: device === "tablet" ? "#007aff" : "#6B7280" }}
          >
            Tab
          </p>
        </button>
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setDevice("desktop")}
        >
          <div
            className="w-[24px] h-[17px] border-2 rounded-sm"
            style={{
              borderColor: device === "desktop" ? "#007aff" : "#4B5563",
            }}
          />
          <p
            className="text-base"
            style={{ color: device === "desktop" ? "#007aff" : "#6B7280" }}
          >
            Desktop
          </p>
        </button>
      </div>
    </div>
  );
}
