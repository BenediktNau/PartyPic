import React from "react";
import { RouterProvider } from "react-router-dom";
import AppRouter from "./util/router/router";

function Layout() {
  return (
    <div className="w-full h-full">
      <RouterProvider router={AppRouter} />
    </div>
  );
}

export default Layout;
