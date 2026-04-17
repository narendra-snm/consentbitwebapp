"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PaymentReceipt from './PaymentReceipt';
import DashboardOverview from './DashboardOverview';

type Screen = 'receipt' | 'dashboard';

export default function PaymentDone({ details,OnClick }: { details: any, OnClick: () => void }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('receipt');

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScreen('dashboard');
    }, 1000); // short delay for transition

    return () => clearTimeout(timer);
  }, []);

  console.log('Current Screen:', currentScreen);
console.log('Payment Details:', details);


  return (
    <>
    {/* <div className="flex justify-between items-center px-8 pt-7.5 pb-5.25 border-b border-[#000000]/10  rounded-t-xl">
        <img
          src="/images/ConsentBit-logo-Dark.png"
          alt="logo"
          className="h-6"
        />
        <button className="text-[14px] font-medium text-[#007aff] hover:text-[#0051d5]">skip to dashboard <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.37879e-05 4.99166V3.88766H6.69609L3.34809 0.767663L4.10409 -0.000336647L8.40009 4.09166V4.75166L4.10409 8.85566L3.34809 8.08766L6.67209 4.99166H9.37879e-05Z" fill="white"/>
</svg>
</button>
      </div> */}
<div className="fixed bg-[#E6F1FD] inset-0 z-50 flex min-h-[100vh] w-[100vw] items-center justify-center overflow-hidden rounded-[24px]">  
     <button className="bg-[#FFFFFF] fixed top-5 right-5 flex items-center rounded-lg text-[14px] font-medium text-[#007aff] hover:text-[#0051d5] text-xs py-3.5 px-3.75 gap-1" onClick={OnClick}>Skip to Dashboard <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9.37879e-05 4.99166V3.88766H6.69609L3.34809 0.767663L4.10409 -0.000336647L8.40009 4.09166V4.75166L4.10409 8.85566L3.34809 8.08766L6.67209 4.99166H9.37879e-05Z" fill="#007aff"/>
</svg>
</button>
    <div> 
        
      <AnimatePresence mode="wait">

        {currentScreen === 'receipt' && (
          <motion.div
            key="receipt"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DashboardOverview />
          </motion.div>
        )}

        {currentScreen === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <PaymentReceipt details={details} OnClick={OnClick} />
          </motion.div>
        )}

      </AnimatePresence>
      </div>
    </div>
    </>
  );
}