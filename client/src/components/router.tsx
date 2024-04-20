import path from "path";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  Link,
} from "react-router-dom";
import AdminPage from "../pages/Admin";
import Upload from "../pages/Upload";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Upload />,
  },

  { path: "admin", element: <AdminPage /> },
]);

export default router;
