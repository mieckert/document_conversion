import axios from 'axios';
import { SalesforceAuth } from '../../src/auth/salesforce-auth';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SalesforceAuth', () => {
  let auth: SalesforceAuth;
  const mockClientId = 'test_client_id';
  const mockClientSecret = 'test_client_secret';
  const mockLoginUrl = 'https://test.salesforce.com';

  beforeEach(() => {
    auth = new SalesforceAuth(mockClientId, mockClientSecret, mockLoginUrl);
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate successfully and retrieve org ID', async () => {
      const mockAccessToken = 'mock_access_token_123';
      const mockInstanceUrl = 'https://instance.salesforce.com';
      const mockOrgId = '00D123456789ABC';

      // Mock OAuth token response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: mockAccessToken,
          instance_url: mockInstanceUrl,
        },
      });

      // Mock org ID query
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          records: [{ Id: mockOrgId }],
        },
      });

      const credentials = await auth.authenticate();

      expect(credentials.accessToken).toBe(mockAccessToken);
      expect(credentials.instanceUrl).toBe(mockInstanceUrl);
      expect(credentials.orgId).toBe(mockOrgId);
      expect(credentials.expiresAt).toBeDefined();

      // Verify OAuth request
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockLoginUrl}/services/oauth2/token`,
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      // Verify org query
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockInstanceUrl}/services/data/v60.0/query`,
        expect.objectContaining({
          params: {
            q: 'SELECT Id FROM Organization LIMIT 1',
          },
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
      );
    });

    it('should handle authentication failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            error: 'invalid_client',
            error_description: 'Invalid client credentials',
          },
        },
        message: 'Request failed with status code 401',
      });

      await expect(auth.authenticate()).rejects.toThrow(
        'Salesforce authentication failed'
      );
    });

    it('should continue if org ID fetch fails', async () => {
      const mockAccessToken = 'mock_token';
      const mockInstanceUrl = 'https://instance.salesforce.com';

      // Mock successful OAuth
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: mockAccessToken,
          instance_url: mockInstanceUrl,
        },
      });

      // Mock failed org query
      mockedAxios.get.mockRejectedValueOnce(new Error('Query failed'));

      const credentials = await auth.authenticate();

      // Should still return credentials, just without orgId
      expect(credentials.accessToken).toBe(mockAccessToken);
      expect(credentials.instanceUrl).toBe(mockInstanceUrl);
      expect(credentials.orgId).toBeUndefined();
    });

    it('should send correct OAuth parameters', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'token',
          instance_url: 'https://test.com',
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { records: [] },
      });

      await auth.authenticate();

      const postCall = mockedAxios.post.mock.calls[0];
      const formData = postCall[1] as URLSearchParams;

      expect(formData.get('grant_type')).toBe('client_credentials');
      expect(formData.get('client_id')).toBe(mockClientId);
      expect(formData.get('client_secret')).toBe(mockClientSecret);
    });
  });

  describe('getCredentials', () => {
    it('should return cached credentials if not expired', async () => {
      const mockToken = 'cached_token';
      const mockInstanceUrl = 'https://cached.salesforce.com';

      // Initial authentication
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: mockToken,
          instance_url: mockInstanceUrl,
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { records: [{ Id: '00D123' }] },
      });

      await auth.authenticate();

      // Get credentials again (should use cache)
      const credentials = await auth.getCredentials();

      expect(credentials.accessToken).toBe(mockToken);
      // Should not make another API call
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should refresh credentials if expired', async () => {
      const oldToken = 'old_token';
      const newToken = 'new_token';

      // Initial authentication
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: oldToken,
          instance_url: 'https://test.com',
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { records: [{ Id: '00D123' }] },
      });

      const credentials = await auth.authenticate();

      // Manually expire the token
      credentials.expiresAt = Date.now() - 1000;

      // Mock refresh authentication
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: newToken,
          instance_url: 'https://test.com',
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { records: [{ Id: '00D123' }] },
      });

      const refreshedCredentials = await auth.getCredentials();

      expect(refreshedCredentials.accessToken).toBe(newToken);
      // Should have made 2 authentication calls
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('should force token refresh', async () => {
      const initialToken = 'initial_token';
      const refreshedToken = 'refreshed_token';

      // Initial auth
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: initialToken,
          instance_url: 'https://test.com',
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { records: [{ Id: '00D123' }] },
      });

      await auth.authenticate();

      // Force refresh
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: refreshedToken,
          instance_url: 'https://test.com',
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { records: [{ Id: '00D123' }] },
      });

      const credentials = await auth.refresh();

      expect(credentials.accessToken).toBe(refreshedToken);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Token Expiration', () => {
    it('should set expiration time to 1 hour in future', async () => {
      const beforeAuth = Date.now();

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'token',
          instance_url: 'https://test.com',
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { records: [] },
      });

      const credentials = await auth.authenticate();
      const afterAuth = Date.now();

      const expectedExpiry = beforeAuth + 3600 * 1000;
      const actualExpiry = credentials.expiresAt || 0;

      // Allow 1 second tolerance for test execution time
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry);
      expect(actualExpiry).toBeLessThanOrEqual(afterAuth + 3600 * 1000);
    });
  });
});
