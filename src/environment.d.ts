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
    JWT_ACCESS_SECRET?: string;
    DEMO_PASSWORD?: string;
  }
}
