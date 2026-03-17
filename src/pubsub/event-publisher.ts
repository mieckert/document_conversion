import { ConvertDocumentComplete, ConvertDocumentRequest } from '../types/events';
import { PubSubClient } from './pubsub-client';

/**
 * Event Publisher for DocumentConversionCompleted__e
 * Publishes conversion completion events to Salesforce
 */
export class EventPublisher {
  private pubSubClient: PubSubClient;

  constructor(pubSubClient: PubSubClient) {
    this.pubSubClient = pubSubClient;
  }

  /**
   * Publish DocumentConversionCompleted event
   */
  async publishComplete(
    request: ConvertDocumentRequest,
    targetContentVersionId: string,
    targetContentDocumentId: string
  ): Promise<void> {
    console.log('[EventPublisher] Publishing DocumentConversionCompleted event');

    const event: ConvertDocumentComplete = {
      sourceContentVersionId__c: request.sourceContentVersionId__c,
      targetContentVersionId__c: targetContentVersionId,
      targetContentDocumentId__c: targetContentDocumentId,
      continuationSObjectType__c: request.continuationSObjectType__c,
      continuationRecordId__c: request.continuationRecordId__c,
      continuationData__c: request.continuationData__c,
    };

    try {
      await this.pubSubClient.publish('/event/DocumentConversionCompleted__e', [event]);
      console.log('[EventPublisher] Event published successfully');
    } catch (error: any) {
      console.error('[EventPublisher] Failed to publish event:', error.message);
      throw error;
    }
  }
}
