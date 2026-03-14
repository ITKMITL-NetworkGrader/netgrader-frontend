import * as Sentry from "@sentry/nuxt";
 
Sentry.init({
  dsn: "https://1d68930b283a17ad16668f3d70fd513e@o4511042648604672.ingest.de.sentry.io/4511042825027664",

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending of user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
