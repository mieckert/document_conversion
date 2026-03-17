## Goal

Build a TypeScript project that does the following:
- Subscribe to a Salesforce Platform Event ConvertDocumentRequest__e
- Download the file given through sourceContentVersionId__c using the
  Salesforce REST API
- Convert the file using LibreOffice (environment variable SOFFICE_EXE;
  default "soffice") via command line, i.e.,
  `soffice --convert-to <value> <filename>`
  where the <value> is coming from convertTo__c field in the event
- Upload the resulting converted file using the Salesforce REST API
- Send the ConvertDocumentComplete__e event to Salesforce

## Connection to Salesforce

Authenticate with a client credentials flow using the environment variables
SF_CLIENT_ID and SF_CLIENT_SECRET.  The login server is in SF_LOGIN_URL, e.g., "https://login.salesforce.com".

Use the Salesforce Pub/Sub API for subscribing to events and sending events.
It is based on gRPC and Apache Avro; the .proto file is located here:
https://github.com/forcedotcom/pub-sub-api/blob/main/pubsub_api.proto 
If required refer to the Pub/Sub API documentation located here:
https://developer.salesforce.com/docs/platform/pub-sub-api/references/methods/getschema-rpc.html

## Platform Event Schemas etc.

Both ConvertDocumentRequest__e and ConvertDocumentCompleted__e both 
have the following fields; ConvertDocumentCompleted__e will simply
copy the values from its corresponding ConvertDocumentRequest__e.
- sourceContentVersionId__c: the Salesforce Record Id of the ContentVersion record
- continuationSObjectType__c: a text field, has no further meaning within the project scope, but is used for internal correlation and continuation by the other party
- continuationRecordId__c: a text field, has no further meaning within the project scope, but is used for internal correlation and continuation by the other party
- continuationData__c: a text field, has no further meaning within the project scope, but is used for internal correlation and continuation by the other party

ConvertDocumentRequest__e has the following additional field:
- convertTo__c: This text field is used to supply the value for the 
  soffice --convert-to <value> switch.

ConvertDocumentCompleted__e has the following additional fields:
- targetContentVersionId__c: the Salesforce Record Id of the uploaded ContentVersion record
- targetContentDocumentId__c: the Salesforce Record Id of the uploaded ContentDocument record

## Downloading and uploading files to Salesforce

To download files, use the Blob Retrieve REST API operation (preceeded by a regular get of the ContentDocument and ContentVersion record as needed): 
https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_blob_retrieve.htm 

To upload files, create ContentDocument and ContentVersion. Refer to this
document for dealing with the files actual (Blob) data: 
https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_sobject_insert_update_blob.htm
Set parameters like file type, pathOnClient, etc. appropriately.

Modularize the upload/download methods and test them independently from the 
remaining code.

## Testing

Build tests. You can use the Salesforce Org to create a test file and
send the ConvertDocumentRequest__e as required. Clean up after yourself, 
i.e., if creating a test file in Salesforce also delete it.
There is an example Excel file located in in the examples/ directory.

