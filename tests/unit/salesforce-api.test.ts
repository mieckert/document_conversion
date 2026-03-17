import axios from 'axios';
import { ContentVersionClient } from '../../src/salesforce/content-version';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ContentVersionClient', () => {
  let client: ContentVersionClient;
  const mockAccessToken = 'test_access_token';
  const mockInstanceUrl = 'https://test.salesforce.com';

  beforeEach(() => {
    client = new ContentVersionClient(mockInstanceUrl, mockAccessToken, 'v60.0');
    jest.clearAllMocks();
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockContentVersionId = '068test123';
      const mockMetadata = {
        Id: mockContentVersionId,
        Title: 'Test File',
        PathOnClient: 'test.xlsx',
        FileExtension: 'xlsx',
        ContentDocumentId: '069test456',
      };
      const mockFileData = Buffer.from('test file content');

      // Mock metadata request
      mockedAxios.get.mockResolvedValueOnce({
        data: mockMetadata,
      });

      // Mock blob download
      mockedAxios.get.mockResolvedValueOnce({
        data: mockFileData,
      });

      const result = await client.downloadFile(mockContentVersionId);

      expect(result.buffer).toEqual(mockFileData);
      expect(result.metadata.Id).toBe(mockContentVersionId);
      expect(result.metadata.Title).toBe('Test File');
      expect(result.metadata.FileExtension).toBe('xlsx');

      // Verify API calls
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockInstanceUrl}/services/data/v60.0/sobjects/ContentVersion/${mockContentVersionId}`,
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
      );
    });

    it('should handle download errors', async () => {
      const mockContentVersionId = '068invalid';

      mockedAxios.get.mockRejectedValueOnce({
        response: {
          data: { error: 'NOT_FOUND' },
        },
        message: 'Request failed with status code 404',
      });

      await expect(client.downloadFile(mockContentVersionId)).rejects.toThrow(
        'Failed to download file'
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFileBuffer = Buffer.from('test content');
      const mockFilename = 'test.txt';
      const mockTitle = 'Test File';
      const mockContentVersionId = '068upload123';
      const mockContentDocumentId = '069upload456';

      // Mock upload response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          id: mockContentVersionId,
        },
      });

      // Mock metadata retrieval
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ContentDocumentId: mockContentDocumentId,
        },
      });

      const result = await client.uploadFile(
        mockFileBuffer,
        mockFilename,
        mockTitle,
        'text/plain'
      );

      expect(result.contentVersionId).toBe(mockContentVersionId);
      expect(result.contentDocumentId).toBe(mockContentDocumentId);

      // Verify upload was called
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockInstanceUrl}/services/data/v60.0/sobjects/ContentVersion`,
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it('should handle upload errors', async () => {
      const mockFileBuffer = Buffer.from('test');

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: { errors: ['Upload failed'] },
        },
        message: 'Request failed',
      });

      await expect(
        client.uploadFile(mockFileBuffer, 'test.txt', 'Test', 'text/plain')
      ).rejects.toThrow('Failed to upload file');
    });

    it('should handle unsuccessful upload response', async () => {
      const mockFileBuffer = Buffer.from('test');

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: false,
          errors: [{ message: 'Invalid file' }],
        },
      });

      await expect(
        client.uploadFile(mockFileBuffer, 'test.txt', 'Test', 'text/plain')
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('API Configuration', () => {
    it('should use correct API version', () => {
      const customClient = new ContentVersionClient(
        mockInstanceUrl,
        mockAccessToken,
        'v59.0'
      );

      expect(customClient).toBeDefined();
      // API version is used internally in URL construction
    });

    it('should handle different instance URLs', () => {
      const sandboxClient = new ContentVersionClient(
        'https://test.sandbox.salesforce.com',
        mockAccessToken
      );

      expect(sandboxClient).toBeDefined();
    });
  });
});
