
import React from 'react'
import Header from '../components/header';

export default function layout({children}:{children:React.ReactNode}) {
  return (
    <>
    <Header/>
      {children}
    </>
  )
}
