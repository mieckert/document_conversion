/**
 * Application configuration loaded from environment variables
 */
export interface AppConfig {
  salesforce: {
    clientId: string;
    clientSecret: string;
    loginUrl: string;
    apiVersion: string;
  };
  pubsub: {
    endpoint: string;
  };
  libreoffice: {
    executable: string;
  };
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): AppConfig {
  const required = [
    'SF_CLIENT_ID',
    'SF_CLIENT_SECRET',
    'SF_LOGIN_URL',
    'SOFFICE_EXE',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    salesforce: {
      clientId: process.env.SF_CLIENT_ID!,
      clientSecret: process.env.SF_CLIENT_SECRET!,
      loginUrl: process.env.SF_LOGIN_URL!,
      apiVersion: process.env.SF_API_VERSION || 'v60.0',
    },
    pubsub: {
      endpoint: process.env.PUBSUB_ENDPOINT || 'api.pubsub.salesforce.com:7443',
    },
    libreoffice: {
      executable: process.env.SOFFICE_EXE!,
    },
  };
}
