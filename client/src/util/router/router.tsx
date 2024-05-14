import React from 'react'
import { createBrowserRouter } from 'react-router-dom'
import FotoPage from '../../views/foto/foto'

const AppRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <FotoPage/>
    ),
  },
  {}
])

export default AppRouter