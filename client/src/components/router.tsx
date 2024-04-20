import path from "path";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  Link,
} from "react-router-dom";
import AdminPage from "../pages/Admin";
import LoginPage from "../pages/login";
import Upload from "../pages/Upload";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Upload />,
  },
  {
    path: "login",
    element: <LoginPage />,
  },
  { path: "admin", element: <AdminPage /> },
  { path: "upload", element: <Upload /> },
]);

export default router;
