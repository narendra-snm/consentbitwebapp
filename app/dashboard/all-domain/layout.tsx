export const runtime = 'edge';
import React from 'react'
import Header from '../components/header';
import DashboardTabs from '../components/DashboardTabs';

export default function layout({children}:{children:React.ReactNode}) {
  return (
    <>
    <Header/>
     <div className="max-w-[1148px] mx-auto pb-4.25">
          <DashboardTabs/>
          
          </div>
      {children}
    </>
  )
}
