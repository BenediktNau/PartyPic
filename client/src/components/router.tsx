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
import Fotos from "../pages/Fotos";
import UserView from "../pages/UserView";
import SeeAllFotos from "../pages/SeeAllFotos";


const router = createBrowserRouter([
  {
    path: "/",
    element: <UserView />,
  },
  { path: "fotos", element: <SeeAllFotos /> },
  { path: "admin", element: <AdminPage /> },

]);

export default router;
