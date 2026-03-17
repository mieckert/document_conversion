import axios from 'axios';
import FormData from 'form-data';
import { ContentVersionMetadata, FileUploadResult } from '../types/events';

/**
 * Salesforce ContentVersion API Client
 * Handles file download and upload operations
 */
export class ContentVersionClient {
  private instanceUrl: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(instanceUrl: string, accessToken: string, apiVersion: string = 'v60.0') {
    this.instanceUrl = instanceUrl;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
  }

  /**
   * Download a file from Salesforce ContentVersion
   */
  async downloadFile(contentVersionId: string): Promise<{ buffer: Buffer; metadata: ContentVersionMetadata }> {
    try {
      console.log(`[SF API] Downloading ContentVersion: ${contentVersionId}`);

      // First, get metadata
      const metadataUrl = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/ContentVersion/${contentVersionId}`;
      const metadataResponse = await axios.get(metadataUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const metadata: ContentVersionMetadata = {
        Id: metadataResponse.data.Id,
        Title: metadataResponse.data.Title,
        PathOnClient: metadataResponse.data.PathOnClient,
        FileExtension: metadataResponse.data.FileExtension,
        ContentDocumentId: metadataResponse.data.ContentDocumentId,
      };

      console.log(`[SF API] File metadata: ${metadata.Title} (${metadata.FileExtension})`);

      // Download the actual file blob
      const blobUrl = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/ContentVersion/${contentVersionId}/VersionData`;
      const blobResponse = await axios.get(blobUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(blobResponse.data);
      console.log(`[SF API] Downloaded ${buffer.length} bytes`);

      return { buffer, metadata };
    } catch (error: any) {
      console.error('[SF API] Download failed:', error.response?.data || error.message);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Upload a file to Salesforce as a new ContentVersion
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    title: string,
    contentType: string = 'application/octet-stream'
  ): Promise<FileUploadResult> {
    try {
      console.log(`[SF API] Uploading file: ${filename} (${fileBuffer.length} bytes)`);

      // Create multipart form data
      const form = new FormData();
      form.append('entity_content', JSON.stringify({
        Title: title,
        PathOnClient: filename,
      }), {
        contentType: 'application/json',
      });
      form.append('VersionData', fileBuffer, {
        filename: filename,
        contentType: contentType,
      });

      const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/ContentVersion`;

      const response = await axios.post(url, form, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          ...form.getHeaders(),
        },
      });

      if (!response.data.success) {
        throw new Error(`Upload failed: ${JSON.stringify(response.data.errors)}`);
      }

      const contentVersionId = response.data.id;
      console.log(`[SF API] Uploaded ContentVersion: ${contentVersionId}`);

      // Retrieve ContentDocumentId
      const metadataUrl = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/ContentVersion/${contentVersionId}`;
      const metadataResponse = await axios.get(metadataUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        params: {
          fields: 'ContentDocumentId',
        },
      });

      const contentDocumentId = metadataResponse.data.ContentDocumentId;
      console.log(`[SF API] ContentDocumentId: ${contentDocumentId}`);

      return {
        contentVersionId,
        contentDocumentId,
      };
    } catch (error: any) {
      console.error('[SF API] Upload failed:', error.response?.data || error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
}
