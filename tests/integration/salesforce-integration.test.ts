import { SalesforceAuth } from '../../src/auth/salesforce-auth';
import { ContentVersionClient } from '../../src/salesforce/content-version';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration tests for Salesforce API
 * These tests require real Salesforce credentials and will create/delete test data
 */
describe('Salesforce Integration Tests', () => {
  let auth: SalesforceAuth;
  let client: ContentVersionClient;
  let testContentVersionId: string;
  let testContentDocumentId: string;

  // Only run these tests if credentials are available
  const hasCredentials =
    process.env.SF_CLIENT_ID &&
    process.env.SF_CLIENT_SECRET &&
    process.env.SF_LOGIN_URL;

  beforeAll(async () => {
    if (!hasCredentials) {
      console.log('⚠️  Skipping integration tests - Salesforce credentials not configured');
      return;
    }

    // Authenticate
    auth = new SalesforceAuth(
      process.env.SF_CLIENT_ID!,
      process.env.SF_CLIENT_SECRET!,
      process.env.SF_LOGIN_URL!
    );

    const credentials = await auth.authenticate();
    client = new ContentVersionClient(
      credentials.instanceUrl,
      credentials.accessToken,
      'v60.0'
    );
  }, 30000);

  describe('File Upload and Download', () => {
    it('should upload a test file to Salesforce', async () => {
      if (!hasCredentials) return;

      // Read test file
      const testFilePath = path.join(__dirname, '../../examples/Financial Sample.xlsx');
      const fileBuffer = fs.readFileSync(testFilePath);

      // Upload file
      const result = await client.uploadFile(
        fileBuffer,
        'test-financial-sample.xlsx',
        'Integration Test - Financial Sample',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      expect(result.contentVersionId).toBeTruthy();
      expect(result.contentVersionId).toMatch(/^068/);
      expect(result.contentDocumentId).toBeTruthy();
      expect(result.contentDocumentId).toMatch(/^069/);

      // Save for cleanup
      testContentVersionId = result.contentVersionId;
      testContentDocumentId = result.contentDocumentId;

      console.log('✅ Uploaded test file:', result);
    }, 60000);

    it('should download the uploaded file and verify content', async () => {
      if (!hasCredentials || !testContentVersionId) return;

      // Download file
      const { buffer, metadata } = await client.downloadFile(testContentVersionId);

      expect(buffer).toBeTruthy();
      expect(buffer.length).toBeGreaterThan(0);
      expect(metadata.Id).toBe(testContentVersionId);
      expect(metadata.FileExtension).toBe('xlsx');

      console.log('✅ Downloaded file:', {
        size: buffer.length,
        title: metadata.Title,
        extension: metadata.FileExtension,
      });
    }, 60000);

    it('should upload and download a round-trip successfully', async () => {
      if (!hasCredentials) return;

      // Create test content
      const originalContent = Buffer.from('Integration test content - ' + Date.now());
      const filename = 'integration-test.txt';

      // Upload
      const uploadResult = await client.uploadFile(
        originalContent,
        filename,
        'Integration Test File',
        'text/plain'
      );

      expect(uploadResult.contentVersionId).toBeTruthy();

      // Download
      const { buffer: downloadedContent, metadata } = await client.downloadFile(
        uploadResult.contentVersionId
      );

      // Verify content matches
      expect(downloadedContent.toString()).toBe(originalContent.toString());
      expect(metadata.Title).toBe('Integration Test File');

      console.log('✅ Round-trip test successful:', {
        originalSize: originalContent.length,
        downloadedSize: downloadedContent.length,
        match: downloadedContent.toString() === originalContent.toString(),
      });

      // Cleanup - note: ContentVersion cannot be deleted, only ContentDocument
      // We'll let afterAll handle cleanup
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle invalid ContentVersion ID gracefully', async () => {
      if (!hasCredentials) return;

      await expect(
        client.downloadFile('068INVALID00000')
      ).rejects.toThrow();
    }, 30000);

    it('should handle empty file upload gracefully', async () => {
      if (!hasCredentials) return;

      const emptyBuffer = Buffer.from('');

      await expect(
        client.uploadFile(
          emptyBuffer,
          'empty.txt',
          'Empty File',
          'text/plain'
        )
      ).rejects.toThrow();
    }, 30000);
  });

  afterAll(async () => {
    if (!hasCredentials) return;

    // Note: Salesforce doesn't allow direct deletion of ContentVersion
    // ContentDocument deletion is typically handled by retention policies
    // In a real scenario, you'd want to implement cleanup logic specific to your org
    console.log('⚠️  Test ContentVersion/ContentDocument IDs (manual cleanup may be needed):');
    if (testContentVersionId) {
      console.log('   ContentVersion:', testContentVersionId);
    }
    if (testContentDocumentId) {
      console.log('   ContentDocument:', testContentDocumentId);
    }
  });
});
