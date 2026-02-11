// Environment variable validation
// This module ensures all required environment variables are present at startup

interface EnvConfig {
  // Azure AD
  AZURE_AD_CLIENT_ID: string;
  AZURE_AD_CLIENT_SECRET: string;
  AZURE_AD_TENANT_ID: string;

  // NextAuth
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;

  // SharePoint
  SHAREPOINT_HOSTNAME: string;
  SHAREPOINT_SITE_PATH: string;
  SHAREPOINT_DRIVE_NAME: string;
  EXCEL_FILE_PATH: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_ID',
  'NEXTAUTH_SECRET',
];

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("your-") ||
    normalized.includes("generate-") ||
    normalized.includes("changeme")
  );
}

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Validate environment variables and return typed config
function validateEnv(): EnvConfig {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]?.trim();
    if (!value) {
      missing.push(envVar);
      continue;
    }
    if (isPlaceholder(value)) {
      invalid.push(`${envVar} (placeholder value)`);
    }
  }

  const clientId = process.env.AZURE_AD_CLIENT_ID?.trim();
  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim();
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();

  if (clientId && !isPlaceholder(clientId) && !isGuid(clientId)) {
    invalid.push("AZURE_AD_CLIENT_ID (must be a GUID)");
  }
  if (tenantId && !isPlaceholder(tenantId) && !isGuid(tenantId)) {
    invalid.push("AZURE_AD_TENANT_ID (must be a GUID)");
  }
  if (nextAuthUrl && !/^https?:\/\//i.test(nextAuthUrl)) {
    invalid.push("NEXTAUTH_URL (must start with http:// or https://)");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file or Vercel environment settings.`
    );
  }
  if (invalid.length > 0) {
    throw new Error(
      `Invalid environment variable values: ${invalid.join(", ")}\n` +
      `Please fix your .env.local file and restart the server.`
    );
  }

  return {
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID!,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET!,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    SHAREPOINT_HOSTNAME: process.env.SHAREPOINT_HOSTNAME!,
    SHAREPOINT_SITE_PATH: process.env.SHAREPOINT_SITE_PATH!,
    SHAREPOINT_DRIVE_NAME: process.env.SHAREPOINT_DRIVE_NAME!,
    EXCEL_FILE_PATH: process.env.EXCEL_FILE_PATH!,
  };
}

// Lazy initialization - validates on first access
let _env: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

// Export individual getters for convenience
export const env = {
  get azureAdClientId() { return getEnv().AZURE_AD_CLIENT_ID; },
  get azureAdClientSecret() { return getEnv().AZURE_AD_CLIENT_SECRET; },
  get azureAdTenantId() { return getEnv().AZURE_AD_TENANT_ID; },
  get nextAuthSecret() { return getEnv().NEXTAUTH_SECRET; },
  get nextAuthUrl() { return getEnv().NEXTAUTH_URL; },
  get sharepointHostname() { return getEnv().SHAREPOINT_HOSTNAME; },
  get sharepointSitePath() { return getEnv().SHAREPOINT_SITE_PATH; },
  get sharepointDriveName() { return getEnv().SHAREPOINT_DRIVE_NAME; },
  get excelFilePath() { return getEnv().EXCEL_FILE_PATH; },
};
