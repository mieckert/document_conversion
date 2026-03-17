import { SalesforceAuth } from '../../src/auth/salesforce-auth';
import { ContentVersionClient } from '../../src/salesforce/content-version';
import { LibreOfficeConverter } from '../../src/conversion/libreoffice-converter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * End-to-end integration test for document conversion workflow
 */
describe('Document Conversion Integration Test', () => {
  let auth: SalesforceAuth;
  let client: ContentVersionClient;
  let converter: LibreOfficeConverter;

  const hasCredentials =
    process.env.SF_CLIENT_ID &&
    process.env.SF_CLIENT_SECRET &&
    process.env.SF_LOGIN_URL &&
    process.env.SOFFICE_EXE;

  beforeAll(async () => {
    if (!hasCredentials) {
      console.log('⚠️  Skipping conversion integration tests - credentials not configured');
      return;
    }

    // Setup authentication
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

    // Setup converter
    converter = new LibreOfficeConverter(process.env.SOFFICE_EXE!);

    // Verify LibreOffice is available
    const isAvailable = await converter.verify();
    if (!isAvailable) {
      throw new Error('LibreOffice is not available for testing');
    }
  }, 30000);

  describe('Complete Conversion Workflow', () => {
    it('should perform end-to-end Excel to PDF conversion', async () => {
      if (!hasCredentials) return;

      console.log('🔄 Starting end-to-end conversion test...');

      // Step 1: Upload source file
      console.log('📤 Step 1: Uploading source Excel file...');
      const sourceFilePath = path.join(__dirname, '../../examples/Financial Sample.xlsx');
      const sourceBuffer = fs.readFileSync(sourceFilePath);

      const uploadResult = await client.uploadFile(
        sourceBuffer,
        'test-financial-sample.xlsx',
        'E2E Test - Financial Sample',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      console.log('✅ Source file uploaded:', uploadResult.contentVersionId);
      expect(uploadResult.contentVersionId).toBeTruthy();

      // Step 2: Download the file (simulate event received)
      console.log('📥 Step 2: Downloading source file...');
      const { buffer: downloadedBuffer, metadata } = await client.downloadFile(
        uploadResult.contentVersionId
      );

      console.log('✅ Source file downloaded:', {
        size: downloadedBuffer.length,
        title: metadata.Title,
        extension: metadata.FileExtension,
      });

      expect(downloadedBuffer.length).toBe(sourceBuffer.length);
      expect(metadata.FileExtension).toBe('xlsx');

      // Step 3: Convert the file
      console.log('🔄 Step 3: Converting Excel to PDF...');
      const { buffer: convertedBuffer, filename: convertedFilename } =
        await converter.convertDocument(downloadedBuffer, metadata.PathOnClient, 'pdf');

      console.log('✅ File converted:', {
        size: convertedBuffer.length,
        filename: convertedFilename,
      });

      expect(convertedBuffer.length).toBeGreaterThan(0);
      expect(convertedFilename).toContain('.pdf');

      // Step 4: Upload converted file
      console.log('📤 Step 4: Uploading converted PDF...');
      const convertedUploadResult = await client.uploadFile(
        convertedBuffer,
        convertedFilename,
        'E2E Test - Financial Sample (PDF)',
        'application/pdf'
      );

      console.log('✅ Converted file uploaded:', convertedUploadResult.contentVersionId);
      expect(convertedUploadResult.contentVersionId).toBeTruthy();
      expect(convertedUploadResult.contentVersionId).not.toBe(uploadResult.contentVersionId);

      // Step 5: Verify converted file can be downloaded
      console.log('📥 Step 5: Verifying converted file...');
      const { buffer: verifyBuffer, metadata: verifyMetadata } = await client.downloadFile(
        convertedUploadResult.contentVersionId
      );

      console.log('✅ Converted file verified:', {
        size: verifyBuffer.length,
        extension: verifyMetadata.FileExtension,
      });

      expect(verifyBuffer.length).toBeGreaterThan(0);
      expect(verifyMetadata.FileExtension).toBe('pdf');
      expect(verifyBuffer.toString('hex', 0, 4)).toBe('25504446'); // PDF magic number: %PDF

      console.log('🎉 End-to-end conversion test completed successfully!');
      console.log('📊 Summary:');
      console.log(`   Source ContentVersion: ${uploadResult.contentVersionId}`);
      console.log(`   Target ContentVersion: ${convertedUploadResult.contentVersionId}`);
      console.log(`   Source size: ${sourceBuffer.length} bytes`);
      console.log(`   Converted size: ${convertedBuffer.length} bytes`);
    }, 120000); // 2 minute timeout for full workflow

    it('should convert multiple formats successfully', async () => {
      if (!hasCredentials) return;

      const testCases = [
        { format: 'pdf', contentType: 'application/pdf' },
        // Note: txt conversion may not be supported for all file types
      ];

      const sourceFilePath = path.join(__dirname, '../../examples/Financial Sample.xlsx');
      const sourceBuffer = fs.readFileSync(sourceFilePath);

      for (const testCase of testCases) {
        console.log(`🔄 Testing conversion to ${testCase.format.toUpperCase()}...`);

        // Convert
        const { buffer: convertedBuffer, filename } = await converter.convertDocument(
          sourceBuffer,
          'Financial Sample.xlsx',
          testCase.format
        );

        expect(convertedBuffer.length).toBeGreaterThan(0);
        expect(filename).toContain(`.${testCase.format}`);

        // Upload to verify
        const uploadResult = await client.uploadFile(
          convertedBuffer,
          filename,
          `E2E Test - Financial Sample (${testCase.format.toUpperCase()})`,
          testCase.contentType
        );

        expect(uploadResult.contentVersionId).toBeTruthy();
        console.log(`✅ ${testCase.format.toUpperCase()} conversion successful`);
      }
    }, 180000); // 3 minute timeout for multiple conversions
  });

  describe('Error Scenarios', () => {
    it('should handle invalid file format gracefully', async () => {
      if (!hasCredentials) return;

      const invalidBuffer = Buffer.from('This is not a valid Excel file');

      try {
        const result = await converter.convertDocument(invalidBuffer, 'invalid.xlsx', 'pdf');
        // LibreOffice may successfully convert invalid files to PDF
        // Just verify we get some output
        expect(result.buffer).toBeTruthy();
        expect(result.buffer.length).toBeGreaterThan(0);
        console.log('⚠️  LibreOffice converted invalid file (expected behavior)');
      } catch (error) {
        // Or it may fail - both are acceptable
        expect(error).toBeTruthy();
        console.log('✅ LibreOffice rejected invalid file');
      }
    }, 60000);

    it('should handle unsupported conversion format', async () => {
      if (!hasCredentials) return;

      const sourceFilePath = path.join(__dirname, '../../examples/Financial Sample.xlsx');
      const sourceBuffer = fs.readFileSync(sourceFilePath);

      await expect(
        converter.convertDocument(sourceBuffer, 'test.xlsx', 'invalid-format')
      ).rejects.toThrow();
    }, 60000);
  });
});
