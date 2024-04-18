import React from "react";
import { RouterProvider } from "react-router-dom";
import router from "../components/router";

function Layout() {
  return (
    <div>
      <div>Hallo</div>
      <RouterProvider router={router} />
    </div>
  );
}

export default Layout;
