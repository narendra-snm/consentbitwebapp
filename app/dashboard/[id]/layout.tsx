import React from 'react'

export const runtime = 'edge'

export default function layout({children}:{children:React.ReactNode}) {
  return (
    <>
      {children}
    </>
  )
}
