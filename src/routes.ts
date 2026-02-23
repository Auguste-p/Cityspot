import { createBrowserRouter } from "react-router";
import { MapView } from "./components/MapView";
import { CreatePost } from "./components/CreatePost";
import { PostDetail } from "./components/PostDetail";
import { Profile } from "./components/Profile";
import { Settings } from "./components/Settings";
import { MunicipalView } from "./components/MunicipalView";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: MapView },
      { path: "create", Component: CreatePost },
      { path: "post/:id", Component: PostDetail },
      { path: "profile", Component: Profile },
      { path: "settings", Component: Settings },
      { path: "municipal", Component: MunicipalView },
    ],
  },
]);