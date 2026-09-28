declare namespace NodeJS {
  interface ProcessEnv {
    ENVIRONMENT?: "development" | "staging" | "production";
    NODE_ENV?: "development" | "test" | "production";
    PORT?: string;
    POSTGRES_HOST?: string;
    POSTGRES_PORT?: string;
    POSTGRES_USER?: string;
    POSTGRES_PASSWORD?: string;
    POSTGRES_DB?: string;
    REDIS_HOST?: string;
    REDIS_PORT?: string;
    REDIS_USERNAME?: string;
    REDIS_PASSWORD?: string;
    REDIS_DB?: string;
    REDIS_TLS?: string;
    CLICKUP_CLIENT_ID?: string;
    CLICKUP_CLIENT_SECRET?: string;
    CLICKUP_REDIRECT_URI?: string;
    ENCRYPTION_KEY?: string;
    JWT_ACCESS_SECRET?: string;
    FRONTEND_URL?: string;
    INTERNAL_API_KEY?: string;
  }
}
