"use client";
import { useState, useEffect, useRef } from 'react';
import PaymentReceipt from './PaymentReceipt';
import DashboardOverview from './DashboardOverview';

type Screen = 'receipt' | 'dashboard';

export default function PaymentDone({ details, OnClick }: { details: any; OnClick: () => void }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('receipt');
  // Tracks whether the exit animation is playing for 'receipt'
  const [receiptExiting, setReceiptExiting] = useState(false);
  // Keeps receipt mounted during its exit animation
  const [receiptMounted, setReceiptMounted] = useState(true);
  // Keeps dashboard mounted once shown
  const [dashboardMounted, setDashboardMounted] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Start receipt fade-out
      setReceiptExiting(true);

      // 2. After exit animation (200ms), unmount receipt and mount dashboard
      const exitTimer = setTimeout(() => {
        setReceiptMounted(false);
        setCurrentScreen('dashboard');
        setDashboardMounted(true);
        // Small rAF gap so browser paints the initial state before animating in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setDashboardVisible(true));
        });
      }, 200);

      return () => clearTimeout(exitTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  console.log('Current Screen:', currentScreen);
  console.log('Payment Details:', details);

  return (
    <>
      <style>{`
        /* Receipt: fade out */
        @keyframes fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .receipt-exit {
          animation: fade-out 0.2s ease forwards;
        }

        /* Dashboard: slide + fade in */
        @keyframes slide-fade-in {
          from { opacity: 0; transform: translateY(100px); }
          to   { opacity: 1; transform: translateY(0);     }
        }
        @keyframes slide-fade-out {
          from { opacity: 1; transform: translateY(0);     }
          to   { opacity: 0; transform: translateY(100px); }
        }
        .dashboard-enter {
          animation: slide-fade-in 0.2s cubic-bezier(0, 0, 0.58, 1) forwards;
        }
        .dashboard-exit {
          animation: slide-fade-out 0.2s cubic-bezier(0, 0, 0.58, 1) forwards;
        }

        /* Keep invisible but painted before animation fires */
        .pre-enter {
          opacity: 0;
          transform: translateY(100px);
        }
      `}</style>

      <div className="fixed bg-[#E6F1FD] inset-0 z-50 flex min-h-[100vh] w-[100vw] items-center justify-center overflow-hidden rounded-[24px]">
        <button
          className="bg-[#FFFFFF] fixed top-5 right-5 flex items-center rounded-lg text-[14px] font-medium text-[#007aff] hover:text-[#0051d5] text-xs py-3.5 px-3.75 gap-1"
          onClick={OnClick}
        >
          Skip to Dashboard{" "}
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.37879e-05 4.99166V3.88766H6.69609L3.34809 0.767663L4.10409 -0.000336647L8.40009 4.09166V4.75166L4.10409 8.85566L3.34809 8.08766L6.67209 4.99166H9.37879e-05Z" fill="#007aff" />
          </svg>
        </button>

        <div>
          {/* Receipt screen — fades out then unmounts */}
          {receiptMounted && (
            <div className={receiptExiting ? 'receipt-exit' : ''}>
              <DashboardOverview />
            </div>
          )}

          {/* Dashboard screen — mounts invisible, then slides in */}
          {dashboardMounted && (
            <div className={dashboardVisible ? 'dashboard-enter' : 'pre-enter'}>
              <PaymentReceipt details={details} OnClick={OnClick} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}