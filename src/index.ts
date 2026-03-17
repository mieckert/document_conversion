import * as dotenv from 'dotenv';
import { loadConfig } from './types/config';
import { SalesforceAuth } from './auth/salesforce-auth';
import { ContentVersionClient } from './salesforce/content-version';
import { PubSubClient } from './pubsub/pubsub-client';
import { EventHandler } from './pubsub/event-handler';
import { EventPublisher } from './pubsub/event-publisher';
import { LibreOfficeConverter } from './conversion/libreoffice-converter';
import { ConvertDocumentRequest } from './types/events';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

const logger = new Logger('Main');

/**
 * Main application class
 */
class DocumentConversionService {
  private config = loadConfig();
  private auth: SalesforceAuth;
  private converter: LibreOfficeConverter;
  private eventHandler = new EventHandler();
  private isRunning = false;

  constructor() {
    this.auth = new SalesforceAuth(
      this.config.salesforce.clientId,
      this.config.salesforce.clientSecret,
      this.config.salesforce.loginUrl
    );
    this.converter = new LibreOfficeConverter(this.config.libreoffice.executable);
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting Document Conversion Service...');

      // Verify LibreOffice is available
      const libreOfficeAvailable = await this.converter.verify();
      if (!libreOfficeAvailable) {
        throw new Error('LibreOffice is not available or not configured correctly');
      }

      // Authenticate with Salesforce
      logger.info('Authenticating with Salesforce...');
      const credentials = await this.auth.authenticate();

      // Connect to Pub/Sub API
      logger.info('Connecting to Pub/Sub API...');

      if (!credentials.orgId) {
        throw new Error('Failed to retrieve Salesforce Org ID');
      }

      const pubSubClient = new PubSubClient(
        credentials.accessToken,
        credentials.instanceUrl,
        credentials.orgId,
        this.config.pubsub.endpoint
      );
      await pubSubClient.connect();

      // Create event publisher
      const eventPublisher = new EventPublisher(pubSubClient);

      // Subscribe to DocumentConversionRequest__e
      logger.info('Subscribing to DocumentConversionRequest__e events...');
      await pubSubClient.subscribe(
        '/event/DocumentConversionRequest__e',
        0, // LATEST replay preset (ReplayPreset.LATEST = 0)
        async (rawEvent: any) => {
          await this.handleConversionRequest(rawEvent, eventPublisher);
        },
        (error: Error) => {
          logger.error('Subscription error:', error);
        }
      );

      this.isRunning = true;
      logger.info('Service started successfully. Listening for conversion requests...');

      // Keep process alive
      process.on('SIGINT', () => {
        logger.info('Received SIGINT. Shutting down gracefully...');
        this.isRunning = false;
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        logger.info('Received SIGTERM. Shutting down gracefully...');
        this.isRunning = false;
        process.exit(0);
      });
    } catch (error: any) {
      logger.error('Failed to start service:', error);
      process.exit(1);
    }
  }

  /**
   * Handle a conversion request event
   */
  private async handleConversionRequest(
    rawEvent: any,
    eventPublisher: EventPublisher
  ): Promise<void> {
    const startTime = Date.now();
    let request: ConvertDocumentRequest | null = null;

    try {
      logger.info('=== Processing Conversion Request ===');

      // Parse and validate event
      request = this.eventHandler.parseConvertRequest(rawEvent);

      // Validate format
      if (!this.eventHandler.isValidFormat(request.convertTo__c)) {
        throw new Error(`Unsupported conversion format: ${request.convertTo__c}`);
      }

      // Get fresh credentials
      const credentials = await this.auth.getCredentials();
      const sfClient = new ContentVersionClient(
        credentials.instanceUrl,
        credentials.accessToken,
        this.config.salesforce.apiVersion
      );

      // Download source file
      logger.info(`Downloading source file: ${request.sourceContentVersionId__c}`);
      const { buffer: sourceBuffer, metadata } = await sfClient.downloadFile(
        request.sourceContentVersionId__c
      );

      // Convert document
      logger.info(`Converting ${metadata.FileExtension} to ${request.convertTo__c}`);
      const { buffer: convertedBuffer, filename: convertedFilename } = await this.converter.convertDocument(
        sourceBuffer,
        metadata.PathOnClient,
        request.convertTo__c
      );

      // Upload converted file
      logger.info('Uploading converted file to Salesforce');
      const title = `${metadata.Title} (${request.convertTo__c.toUpperCase()})`;
      const uploadResult = await sfClient.uploadFile(
        convertedBuffer,
        convertedFilename,
        title,
        this.getContentType(request.convertTo__c)
      );

      // Publish completion event
      logger.info('Publishing DocumentConversionCompleted event');
      await eventPublisher.publishComplete(
        request,
        uploadResult.contentVersionId,
        uploadResult.contentDocumentId
      );

      const duration = Date.now() - startTime;
      logger.info(`=== Conversion Completed Successfully in ${duration}ms ===`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Conversion failed after ${duration}ms:`, error);

      // Log continuation data for debugging
      if (request) {
        logger.error('Failed request details:', {
          sourceContentVersionId: request.sourceContentVersionId__c,
          convertTo: request.convertTo__c,
          continuationData: request.continuationData__c,
        });
      }
    }
  }

  /**
   * Get MIME content type for file format
   */
  private getContentType(format: string): string {
    const contentTypes: { [key: string]: string } = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      odt: 'application/vnd.oasis.opendocument.text',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      odp: 'application/vnd.oasis.opendocument.presentation',
      txt: 'text/plain',
      html: 'text/html',
    };
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }
}

// Start the service
const service = new DocumentConversionService();
service.start().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
