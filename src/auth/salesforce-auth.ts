import axios from 'axios';
import { SalesforceCredentials } from '../types/events';

/**
 * Salesforce Authentication Manager
 * Handles OAuth 2.0 Client Credentials flow and token management
 */
export class SalesforceAuth {
  private credentials?: SalesforceCredentials;
  private clientId: string;
  private clientSecret: string;
  private loginUrl: string;

  constructor(clientId: string, clientSecret: string, loginUrl: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.loginUrl = loginUrl;
  }

  /**
   * Authenticate with Salesforce using OAuth 2.0 Client Credentials flow
   */
  async authenticate(): Promise<SalesforceCredentials> {
    try {
      console.log('[Auth] Authenticating with Salesforce...');

      const response = await axios.post(
        `${this.loginUrl}/services/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.credentials = {
        accessToken: response.data.access_token,
        instanceUrl: response.data.instance_url,
        expiresAt: Date.now() + (3600 * 1000), // Assume 1 hour expiry
      };

      console.log('[Auth] Authentication successful');
      console.log('[Auth] Instance URL:', this.credentials.instanceUrl);

      // Fetch org ID for Pub/Sub API
      try {
        const orgResponse = await axios.get(
          `${this.credentials.instanceUrl}/services/data/v60.0/query`,
          {
            params: {
              q: 'SELECT Id FROM Organization LIMIT 1',
            },
            headers: {
              'Authorization': `Bearer ${this.credentials.accessToken}`,
            },
          }
        );

        if (orgResponse.data.records && orgResponse.data.records.length > 0) {
          (this.credentials as any).orgId = orgResponse.data.records[0].Id;
          console.log('[Auth] Org ID:', (this.credentials as any).orgId);
        }
      } catch (orgError: any) {
        console.warn('[Auth] Failed to fetch org ID:', orgError.message);
      }

      return this.credentials;
    } catch (error: any) {
      console.error('[Auth] Authentication failed:', error.response?.data || error.message);
      throw new Error(`Salesforce authentication failed: ${error.message}`);
    }
  }

  /**
   * Get current credentials, refreshing if expired
   */
  async getCredentials(): Promise<SalesforceCredentials> {
    if (!this.credentials || this.isExpired()) {
      await this.authenticate();
    }
    return this.credentials!;
  }

  /**
   * Check if current token is expired
   */
  private isExpired(): boolean {
    if (!this.credentials?.expiresAt) {
      return true;
    }
    // Refresh 5 minutes before actual expiry
    return Date.now() >= (this.credentials.expiresAt - 5 * 60 * 1000);
  }

  /**
   * Force token refresh
   */
  async refresh(): Promise<SalesforceCredentials> {
    return this.authenticate();
  }
}
