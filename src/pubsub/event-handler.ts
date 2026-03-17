import { ConvertDocumentRequest } from '../types/events';

/**
 * Event Handler for DocumentConversionRequest__e
 * Validates and processes incoming conversion requests
 */
export class EventHandler {
  /**
   * Parse and validate DocumentConversionRequest event
   */
  parseConvertRequest(rawEvent: any): ConvertDocumentRequest {
    console.log('[EventHandler] Parsing DocumentConversionRequest event');

    // Validate required fields
    if (!rawEvent.sourceContentVersionId__c) {
      throw new Error('Missing required field: sourceContentVersionId__c');
    }

    if (!rawEvent.convertTo__c) {
      throw new Error('Missing required field: convertTo__c');
    }

    const request: ConvertDocumentRequest = {
      sourceContentVersionId__c: rawEvent.sourceContentVersionId__c,
      convertTo__c: rawEvent.convertTo__c,
      continuationSObjectType__c: rawEvent.continuationSObjectType__c || undefined,
      continuationRecordId__c: rawEvent.continuationRecordId__c || undefined,
      continuationData__c: rawEvent.continuationData__c || undefined,
    };

    console.log('[EventHandler] Parsed request:', JSON.stringify(request, null, 2));
    return request;
  }

  /**
   * Validate conversion format
   */
  isValidFormat(format: string): boolean {
    const validFormats = ['pdf', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'txt', 'html'];
    return validFormats.includes(format.toLowerCase());
  }
}
