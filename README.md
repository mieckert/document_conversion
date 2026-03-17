# Salesforce Document Conversion Service

A TypeScript-based service that listens to Salesforce platform events containing Content Version Ids
and converts the corresponding files using LibreOffice (e.g., convert an Excel file * .xlsx to PDF,
so that you can use the PDF in Prompt Builder or for other purposes).

Vibe coded and not reviewed. Use at your own risk.

## TODOs:

- [ ] Add Dockerfile (with a docker file that contains nodejs and LibreOffice)
- [ ] Deploy to Heroku or similar service

## Overview

This service:
- Listens to `ConvertDocumentRequest__e` platform events from Salesforce via the Pub/Sub API (gRPC)
- Downloads files from Salesforce using the REST API
- Converts files using LibreOffice command-line tool
- Uploads converted files back to Salesforce
- Publishes `ConvertDocumentComplete__e` events with the results

## Prerequisites

1. **Node.js** (v18 or later) or **Bun**
2. **LibreOffice** installed locally
3. **Salesforce Connected App** with:
   - OAuth Client Credentials flow enabled
   - API access enabled
   - Permissions: API, Pub/Sub API

## Installation

```bash
# Install dependencies
npm install

# Or with bun
bun install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your Salesforce credentials:
```env
SF_CLIENT_ID=your_client_id
SF_CLIENT_SECRET=your_client_secret
SF_LOGIN_URL=https://login.salesforce.com
SOFFICE_EXE=/Applications/LibreOffice.app/Contents/MacOS/soffice
```

Or source the existing `env.sh`:
```bash
source env.sh
```

## Usage

### Build the project
```bash
npm run build
```

### Run the service
```bash
npm start
```

### Development mode (with auto-reload)
```bash
npm run dev
```

## Platform Events

### ConvertDocumentRequest__e (Input)

Fields:
- `sourceContentVersionId__c` (Text, Required) - ContentVersion ID to convert
- `convertTo__c` (Text, Required) - Target format (e.g., "pdf", "docx")
- `continuationSObjectType__c` (Text, Optional) - SObject type for continuation
- `continuationRecordId__c` (Text, Optional) - Record ID for continuation
- `continuationData__c` (Text, Optional) - Custom data to pass through

### ConvertDocumentComplete__e (Output)

Fields:
- `sourceContentVersionId__c` (Text) - Original ContentVersion ID
- `targetContentVersionId__c` (Text) - New ContentVersion ID
- `targetContentDocumentId__c` (Text) - New ContentDocument ID
- `continuationSObjectType__c` (Text) - Copied from request
- `continuationRecordId__c` (Text) - Copied from request
- `continuationData__c` (Text) - Copied from request

## Supported Conversion Formats

- PDF: `pdf`
- Microsoft Word: `docx`
- Microsoft Excel: `xlsx`
- Microsoft PowerPoint: `pptx`
- OpenDocument Text: `odt`
- OpenDocument Spreadsheet: `ods`
- OpenDocument Presentation: `odp`
- Plain Text: `txt`
- HTML: `html`

## Testing

### Run tests
```bash
npm test
```

### Run integration tests
```bash
npm run test:integration
```

## Example: Publishing a Conversion Request from Salesforce

```apex
// Upload a test file and get its ContentVersion ID
ContentVersion cv = [SELECT Id FROM ContentVersion WHERE Title = 'Test Document' LIMIT 1];

// Publish conversion request
ConvertDocumentRequest__e event = new ConvertDocumentRequest__e(
    sourceContentVersionId__c = cv.Id,
    convertTo__c = 'pdf',
    continuationData__c = 'test-run-1'
);
EventBus.publish(event);
```

## Architecture

```
src/
├── index.ts                    # Main entry point and orchestration
├── auth/
│   └── salesforce-auth.ts      # OAuth authentication
├── salesforce/
│   └── content-version.ts      # File download/upload
├── pubsub/
│   ├── pubsub-client.ts        # gRPC Pub/Sub client
│   ├── event-handler.ts        # Event parsing and validation
│   └── event-publisher.ts      # Event publishing
├── conversion/
│   └── libreoffice-converter.ts # Document conversion
├── types/
│   ├── events.ts               # Type definitions
│   └── config.ts               # Configuration types
└── utils/
    └── logger.ts               # Logging utility
```

## Troubleshooting

### LibreOffice not found
Ensure `SOFFICE_EXE` points to the correct LibreOffice executable:
- macOS: `/Applications/LibreOffice.app/Contents/MacOS/soffice`
- Linux: `/usr/bin/soffice`
- Windows: `C:\Program Files\LibreOffice\program\soffice.exe`

### Authentication fails
- Verify your Connected App credentials
- Ensure the Connected App has the correct OAuth flow enabled
- Check that the client secret hasn't expired

### Events not received
- Verify the platform events are properly defined in Salesforce
- Check that your user has access to publish/subscribe to these events
- Ensure the Pub/Sub API is enabled in your Salesforce org

## License

MIT
