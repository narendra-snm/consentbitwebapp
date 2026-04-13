"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LoadingScreen from './components/LoadingScreen';
import PaymentReceipt from './components/PaymentReceipt';
import DashboardOverview from './components/DashboardOverview';

type Screen = 'loading' | 'receipt' | 'dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');

  useEffect(() => {
    // Show loading screen for 5 seconds
    const loadingTimer = setTimeout(() => {
      setCurrentScreen('receipt');
      
      // Immediately switch to dashboard (50ms delay to allow brief receipt display)
      const receiptTimer = setTimeout(() => {
        setCurrentScreen('dashboard');
      }, 1000);

      return () => clearTimeout(receiptTimer);
    }, 5000);

    return () => clearTimeout(loadingTimer);
  }, []);
console.log('Current Screen:', currentScreen);
  return (
    <div className="size-full flex items-center justify-center bg-[#e6f1fd]">
      <AnimatePresence mode="wait">
        {currentScreen === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className=""
          >
            <LoadingScreen />
          </motion.div>
        )}

        {currentScreen === 'receipt' && (
          <motion.div
            key="receipt"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            className=""
          >
              <DashboardOverview />
           
          </motion.div>
        )}

        {currentScreen === 'dashboard' && (
          <motion.div
          
             key="dashboard"
    initial={{ opacity: 0, y: 100 }}   // start well below
    animate={{ opacity: 1, y: 0 }}     // move to position
    exit={{ opacity: 0, y: 100 }}      // optional: slide down on exit
    transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <PaymentReceipt />
           
        
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}