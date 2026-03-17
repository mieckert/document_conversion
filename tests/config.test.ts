import { loadConfig } from '../src/types/config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load valid configuration', () => {
      process.env.SF_CLIENT_ID = 'test_client_id';
      process.env.SF_CLIENT_SECRET = 'test_client_secret';
      process.env.SF_LOGIN_URL = 'https://test.salesforce.com';
      process.env.SOFFICE_EXE = '/usr/bin/soffice';
      process.env.SF_API_VERSION = 'v60.0';
      process.env.PUBSUB_ENDPOINT = 'api.pubsub.salesforce.com:7443';

      const config = loadConfig();

      expect(config.salesforce.clientId).toBe('test_client_id');
      expect(config.salesforce.clientSecret).toBe('test_client_secret');
      expect(config.salesforce.loginUrl).toBe('https://test.salesforce.com');
      expect(config.salesforce.apiVersion).toBe('v60.0');
      expect(config.pubsub.endpoint).toBe('api.pubsub.salesforce.com:7443');
      expect(config.libreoffice.executable).toBe('/usr/bin/soffice');
    });

    it('should use default values for optional fields', () => {
      process.env.SF_CLIENT_ID = 'test_client_id';
      process.env.SF_CLIENT_SECRET = 'test_client_secret';
      process.env.SF_LOGIN_URL = 'https://test.salesforce.com';
      process.env.SOFFICE_EXE = '/usr/bin/soffice';

      const config = loadConfig();

      expect(config.salesforce.apiVersion).toBe('v60.0');
      expect(config.pubsub.endpoint).toBe('api.pubsub.salesforce.com:7443');
    });

    it('should throw error when required fields are missing', () => {
      // Clear all required environment variables
      delete process.env.SF_CLIENT_ID;
      delete process.env.SF_CLIENT_SECRET;
      delete process.env.SF_LOGIN_URL;
      delete process.env.SOFFICE_EXE;

      expect(() => {
        loadConfig();
      }).toThrow('Missing required environment variables');
    });
  });
});
