export default () => ({
  app: {
    environment: process.env.ENVIRONMENT || "development",
    nodeEnv: process.env.NODE_ENV || "development",
    name: process.env.APP_NAME || "ClickUp Automation API",
    prefix: process.env.APP_PREFIX || "api",
    url: process.env.APP_URL || "http://localhost:4000",
    port: Number(process.env.PORT || 4000),
    docsPrefix: process.env.DOCS_PREFIX || "docs",
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  },
  pg: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "admin",
    password: process.env.POSTGRES_PASSWORD || "admin",
    db: process.env.POSTGRES_DB || "clickup_automation",
  },
  redis: {
    host: process.env.REDIS_HOST || "",
    port: Number(process.env.REDIS_PORT || 6379),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
    tls: String(process.env.REDIS_TLS || "true") === "true",
  },
  clickup: {
    clientId: process.env.CLICKUP_CLIENT_ID || "",
    clientSecret: process.env.CLICKUP_CLIENT_SECRET || "",
    redirectUri: process.env.CLICKUP_REDIRECT_URI || "",
    apiBaseUrl: process.env.CLICKUP_API_BASE_URL || "https://api.clickup.com/api/v2",
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || "development-only-encryption-key",
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "development-only-jwt-access-secret",
    jwtIssuer: process.env.JWT_ISSUER || "clickup-automation-api",
    jwtAudience: process.env.JWT_AUDIENCE || "clickup-automation-web",
    accessTokenTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || "clickup_refresh",
    internalApiKey: process.env.INTERNAL_API_KEY || "",
  },
  cron: {
    disabled: String(process.env.CRON_JOBS_DISABLED || "false") === "true",
    timezone: process.env.CRON_JOBS_TIMEZONE || "Asia/Karachi",
    timeEntrySyncExpression: process.env.TIME_ENTRY_SYNC_CRON || "0 */5 * * * *",
  },
});

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const environment = String(config.ENVIRONMENT || "development");
  const required = [
    "POSTGRES_HOST",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
  ];

  if (environment === "production") {
    required.push(
      "ENCRYPTION_KEY",
      "JWT_ACCESS_SECRET",
      "FRONTEND_URL",
    );
  }

  const missing = required.filter((key) => !config[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return config;
}
