import { createBrowserRouter, createHashRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProgramsPage } from "./routes/programs";
import { PlaylistPage } from "./routes/playlist";
import { apiClient } from "./lib/apiClient";

// Use HashRouter for Electron, BrowserRouter for web
const createRouter = apiClient.isElectronMode() ? createHashRouter : createBrowserRouter;

export const router = createRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ProgramsPage />,
      },
      {
        path: "programs",
        element: <ProgramsPage />,
      },
      {
        path: "playlist",
        element: <PlaylistPage />,
      },
    ],
  },
]);
