import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: async () => {
      const { default: LoginPage } = await import("./components/LoginPage");
      return { Component: LoginPage };
    },
  },
  // Pages légales : publiques (lisibles avant l'inscription), hors de Layout.
  {
    path: "/mentions-legales",
    lazy: async () => {
      const { default: MentionsLegales } = await import("./components/legal/MentionsLegales");
      return { Component: MentionsLegales };
    },
  },
  {
    path: "/cgu",
    lazy: async () => {
      const { default: Cgu } = await import("./components/legal/Cgu");
      return { Component: Cgu };
    },
  },
  {
    path: "/confidentialite",
    lazy: async () => {
      const { default: Confidentialite } = await import("./components/legal/Confidentialite");
      return { Component: Confidentialite };
    },
  },
  {
    path: "/accessibilite",
    lazy: async () => {
      const { default: Accessibilite } = await import("./components/legal/Accessibilite");
      return { Component: Accessibilite };
    },
  },
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
        path: "create/:id",
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
        path: "user/:id",
        lazy: async () => {
          const { PublicProfile } = await import("./components/PublicProfile");
          return { Component: PublicProfile };
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