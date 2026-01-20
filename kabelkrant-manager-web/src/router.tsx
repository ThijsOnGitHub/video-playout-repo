import { routeTree } from "./routeTree.gen";
import * as Sentry from "@sentry/tanstackstart-react";
import { createRouter } from "@tanstack/react-router";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  });

  if (!router.isServer) {
    Sentry.init({
      dsn: "https://dd65257854a3a1d4c2605a5bbf0dcb5c@o4510744023531520.ingest.de.sentry.io/4510744025235536",

      // Adds request headers and IP for users, for more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
      sendDefaultPii: true,

      integrations: [
        Sentry.replayIntegration(),
      ],

      // Capture Replay for 10% of all sessions,
      // plus for 100% of sessions with an error.
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
