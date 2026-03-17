# Quick Start Guide

## 1. Verify Setup

Run the verification script to check your environment:

```bash
npm run verify
```

This will check:
- Node.js version (v18+)
- Environment variables
- LibreOffice installation
- Dependencies
- TypeScript build

## 2. Start the Service

```bash
# Source environment variables (if using env.sh)
source env.sh

# Start the service
npm start
```

You should see output like:
```
[2026-03-17T...] [Main] Starting Document Conversion Service...
[2026-03-17T...] [Main] Authenticating with Salesforce...
[Auth] Authentication successful
[Auth] Instance URL: https://your-instance.salesforce.com
[2026-03-17T...] [Main] Connecting to Pub/Sub API...
[PubSub] Connected to: api.pubsub.salesforce.com:7443
[2026-03-17T...] [Main] Subscribing to ConvertDocumentRequest__e events...
[PubSub] Schema retrieved for: /event/ConvertDocumentRequest__e
[PubSub] Subscription active
[2026-03-17T...] [Main] Service started successfully. Listening for conversion requests...
```

## 3. Test the Service

### From Salesforce Developer Console

1. First, upload a test file and get its ContentVersion ID:

```apex
// Query for an existing ContentVersion
ContentVersion cv = [SELECT Id, Title FROM ContentVersion WHERE Title = 'Financial Sample' LIMIT 1];
System.debug('ContentVersion ID: ' + cv.Id);
```

2. Publish a conversion request event:

```apex
// Create and publish the event
ConvertDocumentRequest__e event = new ConvertDocumentRequest__e(
    sourceContentVersionId__c = '068...', // Your ContentVersion ID
    convertTo__c = 'pdf',
    continuationData__c = 'test-1'
);

EventBus.publish(event);
System.debug('Event published');
```

3. Check the service logs for processing output:

```
[Main] === Processing Conversion Request ===
[EventHandler] Parsing ConvertDocumentRequest event
[SF API] Downloading ContentVersion: 068...
[SF API] File metadata: Financial Sample (xlsx)
[SF API] Downloaded 123456 bytes
[Converter] Converting xlsx to pdf
[Converter] Conversion successful: 789012 bytes
[SF API] Uploading file: Financial Sample.pdf
[SF API] Uploaded ContentVersion: 068...
[SF API] ContentDocumentId: 069...
[EventPublisher] Publishing ConvertDocumentComplete event
[PubSub] Events published successfully
[Main] === Conversion Completed Successfully in 2345ms ===
```

4. Subscribe to completion events in Salesforce:

```apex
// Create a trigger on ConvertDocumentComplete__e
trigger ConvertDocumentCompleteTrigger on ConvertDocumentComplete__e (after insert) {
    for (ConvertDocumentComplete__e event : Trigger.new) {
        System.debug('Conversion completed!');
        System.debug('Source: ' + event.sourceContentVersionId__c);
        System.debug('Target: ' + event.targetContentVersionId__c);
        System.debug('Document: ' + event.targetContentDocumentId__c);
    }
}
```

## 4. Verify Converted File

```apex
// Query for the converted file
ContentVersion converted = [
    SELECT Id, Title, FileExtension, ContentDocumentId
    FROM ContentVersion
    WHERE Id = '068...' // targetContentVersionId__c from event
];

System.debug('Converted file: ' + converted.Title);
System.debug('Format: ' + converted.FileExtension);
```

## Supported Conversion Formats

| From | To |
|------|-----|
| Excel (.xlsx, .xls) | pdf, docx, html, txt, ods |
| Word (.docx, .doc) | pdf, html, txt, odt |
| PowerPoint (.pptx, .ppt) | pdf, html, odp |
| PDF (.pdf) | docx, txt, html |
| OpenDocument (.odt, .ods, .odp) | pdf, docx, xlsx, pptx, html |

## Troubleshooting

### Service won't start

1. Run `npm run verify` to check setup
2. Ensure `env.sh` is sourced: `source env.sh`
3. Verify LibreOffice path: `"$SOFFICE_EXE" --version`
4. Check credentials are correct

### Events not received

1. Verify platform events are defined in Salesforce
2. Check user permissions for Pub/Sub API
3. Verify the event channel name: `/event/ConvertDocumentRequest__e`
4. Check Salesforce Event Monitoring logs

### Conversion fails

1. Check LibreOffice supports the format
2. Verify source file is valid and not corrupted
3. Check temp directory permissions
4. Review service logs for detailed error messages

### Files not uploading

1. Verify API user has ContentVersion create permissions
2. Check file size limits (max 2GB)
3. Ensure network connectivity to Salesforce
4. Review service logs for API errors

## Next Steps

- Set up error monitoring
- Configure log aggregation
- Create Salesforce Flow to trigger conversions
- Build Apex service for synchronous conversions
- Add Docker deployment
- Set up CI/CD pipeline

## Getting Help

- Review logs in console output
- Check [GitHub Issues](https://github.com/forcedotcom/pub-sub-api/issues) for Pub/Sub API problems
- Consult [Salesforce Developer Documentation](https://developer.salesforce.com/)
