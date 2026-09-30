export default () => ({
  app: {
    name: process.env.APP_NAME || "Field Sales API",
    prefix: process.env.APP_PREFIX || "api",
    port: Number(process.env.PORT || 4000),
    docsPrefix: process.env.DOCS_PREFIX || "docs",
    allowedOrigins: (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean),
  },
  pg: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "admin",
    password: process.env.POSTGRES_PASSWORD || "admin",
    db: process.env.POSTGRES_DB || "field_sales",
  },
  security: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "development-only-change-me",
    jwtIssuer: process.env.JWT_ISSUER || "field-sales-api",
    jwtAudience: process.env.JWT_AUDIENCE || "field-sales-clients",
    accessTokenTtl: process.env.JWT_ACCESS_TTL || "8h",
  },
});
export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  if (config.ENVIRONMENT === "production" && !config.JWT_ACCESS_SECRET)
    throw new Error("JWT_ACCESS_SECRET is required in production");
  return config;
}
