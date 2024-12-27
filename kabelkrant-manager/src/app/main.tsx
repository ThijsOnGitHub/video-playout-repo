import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './style/index.scss'
import './style/tailwind.css'
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: "https://d28d7bf99eac503fda338df87d1ae5a6@o4506860416401408.ingest.us.sentry.io/4506860428197888",
  integrations: [
      // See docs for support of different versions of variation of react router
      // https://docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/react-router/
    Sentry.replayIntegration()
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  tracesSampleRate: 1.0,

  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost"],

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
