"use client";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./SideBar";
import ConsentPreview from "./ConsentPreview";
import BannerControl from "./BannerControl";
import ColorPickerPanel from "./ColorPickerPanel";
import FontPickerPanel from "./FontPickerPanel";
import { CookieNoticeAccordion2 } from "./CookieNoticeAccordion2";
import PreferenceBannerAccordion from "./PreferenceBannerAccordion";
import CookieListAccordion from "./CookieListAccordion";
import { FloatingButtonSettings } from "./FloatingButtonSettings";
import { RegulationSelector } from "./RegulationSelector";
import { updateSiteBannerSettings } from "@/lib/client-api";
import { useRouter } from "next/navigation";
import { useDashboardSession } from "../../../DashboardSessionProvider";

export default function page({ siteId }: { siteId: string }) {
  const [active, setActive] = useState("General");
  const router = useRouter();
  const [updatingRegulation, setUpdatingRegulation] = useState(false);
  const { loading, authenticated, sites, effectivePlanId, updateSiteInState } = useDashboardSession();
  const site = sites.find((s: any) => String(s?.id) === String(siteId)) || null;

  const consentType = useMemo<'gdpr' | 'ccpa' | 'both'>(() => {
    const bannerType = site?.banner_type || 'gdpr';
    const regionMode = site?.region_mode || 'gdpr';
    if (regionMode === 'both') return 'both';
    if (bannerType === 'ccpa' || regionMode === 'ccpa') return 'ccpa';
    return 'gdpr';
  }, [site]);

  // For the free plan we always force the preview to match the single selected banner.
  const previewBannerType = useMemo<'gdpr' | 'ccpa' | undefined>(() => {
    if (effectivePlanId !== 'free') return undefined;
    return consentType === 'ccpa' ? 'ccpa' : 'gdpr';
  }, [effectivePlanId, consentType]);

  useEffect(() => {
    if (loading) return;
    if (!authenticated) router.replace("/login");
  }, [authenticated, loading, router]);

  const handleRegulationChange = async (next: {
    bannerType: 'gdpr' | 'ccpa';
    regionMode: 'gdpr' | 'ccpa' | 'both';
  }) => {
    if (!site) return;
    try {
      setUpdatingRegulation(true);
      await updateSiteBannerSettings({
        name: String(site.name || site.domain || ''),
        domain: String(site.domain || ''),
        bannerType: next.bannerType,
        regionMode: next.regionMode,
      });

      updateSiteInState({
        id: String(site.id),
        banner_type: next.bannerType,
        region_mode: next.regionMode,
      });
    } catch (e) {
      console.error("[cookie-banner] failed to update banner settings", e);
    } finally {
      setUpdatingRegulation(false);
    }
  };

  return (
    <div className="border-t border-[#00000010] mt-0.25 grid grid-cols-[172px_minmax(420px,454px)_740px]">
      <Sidebar active={active} setActive={setActive} />
      <div className="w-full  px-5.5 pt-10 space-y-5 border-r border-[#00000010]">
        {/* Consent Template Card */}
        {active === "General" && (
          <div>
            <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4 mb-4.25">
              <p className="font-semibold text-base text-black mb-3">
                Consent template
              </p>

              <div className="relative mb-3">
                <RegulationSelector
                  site={site}
                  loading={loading || updatingRegulation}
                  effectivePlanId={effectivePlanId}
                  onChange={handleRegulationChange}
                />
              </div>

              <p className="text-[15px] leading-[22px] text-black tracking-tight">
                The selected template (opt-out banner) supports CCA/CPRA
                (California), VCDPA (Virginia), CPA (Colorado), CTDPA
                (Connecticut), & UCPA (Utah)
              </p>
            </div>

            {/* IAB Support Card */}
            <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4">
              <p className="font-semibold text-base text-black mb-4">
                Support IAB TCF v2.3
              </p>

              {/* Toggle 1 */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-black tracking-tight">
                  Support Google's Additional Consent Mode
                </p>

                <div className="relative">
                  <div className="bg-[#d8d8d8] h-[22px] w-[42px] rounded-full"></div>
                  <div className="absolute bg-white left-[3px] top-[2px] rounded-full w-[18px] h-[18px]"></div>
                </div>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-black tracking-tight">
                  Enable Google's Advertiser Consent Mode
                </p>

                <div className="relative">
                  <div className="bg-[#d8d8d8] h-[22px] w-[42px] rounded-full"></div>
                  <div className="absolute bg-white left-[3px] top-[2px] rounded-full w-[18px] h-[18px]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {active === "Content" && (
          <>
            <div className="bg-[#f9f9fa] border border-[#e5e5e5] rounded-lg p-4 mb-4.25">
              <p className="font-semibold text-base text-black mb-3">
                Content settings
              </p>
            </div>
            <CookieNoticeAccordion2 />
            <PreferenceBannerAccordion /> <CookieListAccordion /><FloatingButtonSettings/>
            
          </>
        )}
        {active === "Layout" && <BannerControl />}
        {active === "Colors" && <ColorPickerPanel />}
        {active === "Type" && <FontPickerPanel />}
      </div>
      <ConsentPreview
        previewBannerType={previewBannerType}
        siteDomain={site?.domain ?? null}
        consentType={consentType}
      />
    </div>
  );
}
