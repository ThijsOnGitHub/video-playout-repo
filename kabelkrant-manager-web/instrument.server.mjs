import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://dd65257854a3a1d4c2605a5bbf0dcb5c@o4510744023531520.ingest.de.sentry.io/4510744025235536",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  // Only enable Sentry in production
  enabled: process.env.NODE_ENV === "production",
});