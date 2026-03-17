/**
 * Platform Event: DocumentConversionRequest__e
 * Received from Salesforce to initiate document conversion
 */
export interface ConvertDocumentRequest {
  sourceContentVersionId__c: string;
  convertTo__c: string;
  continuationSObjectType__c?: string;
  continuationRecordId__c?: string;
  continuationData__c?: string;
}

/**
 * Platform Event: DocumentConversionCompleted__e
 * Published to Salesforce after conversion completes
 */
export interface ConvertDocumentComplete {
  sourceContentVersionId__c: string;
  targetContentVersionId__c: string;
  targetContentDocumentId__c: string;
  continuationSObjectType__c?: string;
  continuationRecordId__c?: string;
  continuationData__c?: string;
}

/**
 * Salesforce OAuth credentials
 */
export interface SalesforceCredentials {
  accessToken: string;
  instanceUrl: string;
  orgId?: string;
  expiresAt?: number;
}

/**
 * ContentVersion metadata from Salesforce
 */
export interface ContentVersionMetadata {
  Id: string;
  Title: string;
  PathOnClient: string;
  FileExtension: string;
  ContentDocumentId: string;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  contentVersionId: string;
  contentDocumentId: string;
}
