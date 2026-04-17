import React from 'react'

export const runtime = 'edge'
import DashboardTabs from "../components/DashboardTabs";

import Header from "../components/header";
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
