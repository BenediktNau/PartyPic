import React from 'react'
import { RouterProvider } from 'react-router-dom'
import AppRouter from './util/router/router'

function Layout() {
  return (
    <RouterProvider router={AppRouter}/>
  )
}

export default Layout