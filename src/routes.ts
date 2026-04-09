import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        lazy: async () => {
          const { MapView } = await import("./components/MapView");
          return { Component: MapView };
        },
      },
      {
        path: "create",
        lazy: async () => {
          const { CreatePost } = await import("./components/CreatePost");
          return { Component: CreatePost };
        },
      },
      {
        path: "post/:id",
        lazy: async () => {
          const { PostDetail } = await import("./components/PostDetail");
          return { Component: PostDetail };
        },
      },
      {
        path: "profile",
        lazy: async () => {
          const { Profile } = await import("./components/Profile");
          return { Component: Profile };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const { Settings } = await import("./components/Settings");
          return { Component: Settings };
        },
      },
      {
        path: "municipal",
        lazy: async () => {
          const { MunicipalView } = await import("./components/MunicipalView");
          return { Component: MunicipalView };
        },
      },
    ],
  },
]);