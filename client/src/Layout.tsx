import React from "react";
import { RouterProvider } from "react-router-dom";
import router from "./components/router";
import { ReactComponent as Logo } from "./assets/logo.svg";

function Layout() {
  return (
    <div className="pt-10 w-screen h-screen bg-[#f1f0ef] font-[MyFont] space-y-6">
      <div className="mt-[-2em] mx-2">
        <Logo className="w-[150px] " />
      </div>

      <RouterProvider router={router} />
    </div>
  );
}

export default Layout;
