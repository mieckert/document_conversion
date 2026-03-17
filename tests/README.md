# Test Suite Documentation

## Overview

This test suite provides comprehensive testing for the Salesforce Document Conversion Service, including unit tests and integration tests.

## Test Structure

```
tests/
├── unit/                      # Unit tests (mocked dependencies)
│   ├── auth.test.ts          # Authentication module tests
│   ├── converter.test.ts     # LibreOffice converter tests
│   └── salesforce-api.test.ts # Salesforce API client tests
├── integration/               # Integration tests (real services)
│   ├── salesforce-integration.test.ts    # File upload/download tests
│   └── conversion-integration.test.ts     # End-to-end conversion tests
├── config.test.ts            # Configuration tests
├── event-handler.test.ts     # Event handler tests
└── setup.ts                  # Jest setup file

```

## Running Tests

### Unit Tests (Fast, No Credentials Needed)

```bash
npm run test:unit
```

Unit tests use mocked dependencies and don't require Salesforce credentials or LibreOffice installation.

**Test Coverage:**
- ✅ 23 unit tests
- Authentication with OAuth 2.0
- File upload/download logic
- Document conversion logic
- Event parsing and validation
- Configuration loading

### Integration Tests (Require Credentials)

```bash
# Ensure credentials are set
source env.sh

# Run integration tests
npm run test:integration
```

Integration tests connect to a real Salesforce org and require:
- Valid Salesforce credentials (SF_CLIENT_ID, SF_CLIENT_SECRET, SF_LOGIN_URL)
- LibreOffice installed (SOFFICE_EXE)

**Test Coverage:**
- ✅ File upload to Salesforce
- ✅ File download from Salesforce
- ✅ Round-trip file integrity verification
- ✅ End-to-end document conversion (Excel → PDF)
- ✅ Multiple format conversions
- ✅ Error handling

### All Tests

```bash
npm run test:all
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

## Test Configuration

### Environment Variables

Integration tests require these environment variables:

```bash
# Required for integration tests
SF_CLIENT_ID=your_client_id
SF_CLIENT_SECRET=your_client_secret
SF_LOGIN_URL=https://your-org.my.salesforce.com
SOFFICE_EXE=/path/to/soffice

# Optional
VERBOSE_TESTS=true  # Show console output during tests
```

### Jest Configuration

Configuration in `jest.config.js`:
- **Preset**: ts-jest
- **Environment**: node
- **Timeout**: 30 seconds (default)
- **Setup**: Runs `tests/setup.ts` before all tests

## Unit Tests Detail

### Authentication Tests (`auth.test.ts`)

Tests for `SalesforceAuth` class:
- ✅ Successful authentication with org ID retrieval
- ✅ Authentication failure handling
- ✅ Token caching and retrieval
- ✅ Automatic token refresh on expiration
- ✅ Force refresh capability
- ✅ Token expiration timing
- ✅ OAuth parameter validation

### Converter Tests (`converter.test.ts`)

Tests for `LibreOfficeConverter` class:
- ✅ LibreOffice availability verification
- ✅ Successful document conversion
- ✅ Conversion error handling
- ✅ Missing output file handling
- ✅ Temp directory cleanup
- ✅ Multiple file format support
- ✅ Command construction validation

### Salesforce API Tests (`salesforce-api.test.ts`)

Tests for `ContentVersionClient` class:
- ✅ File download with metadata retrieval
- ✅ File upload with multipart form data
- ✅ Download error handling
- ✅ Upload error handling
- ✅ API version configuration
- ✅ Instance URL handling

## Integration Tests Detail

### Salesforce Integration (`salesforce-integration.test.ts`)

End-to-end tests with real Salesforce org:
- ✅ Upload test file and verify IDs
- ✅ Download uploaded file and verify content
- ✅ Round-trip upload/download verification
- ✅ Invalid ContentVersion ID handling
- ✅ Empty file upload handling

### Conversion Integration (`conversion-integration.test.ts`)

Complete workflow tests:
- ✅ End-to-end Excel to PDF conversion
  1. Upload source Excel file
  2. Download from Salesforce
  3. Convert to PDF using LibreOffice
  4. Upload converted PDF
  5. Verify PDF is valid
- ✅ Multiple format conversion testing
- ✅ Invalid file format handling
- ✅ Unsupported format error handling

## Test Data

Integration tests use files from `examples/` directory:
- `Financial Sample.xlsx` - Excel file for conversion tests
- `Financial Sample.pdf` - PDF reference file

## Best Practices

### Writing New Tests

1. **Unit Tests**: Mock all external dependencies
   ```typescript
   jest.mock('axios');
   const mockedAxios = axios as jest.Mocked<typeof axios>;
   ```

2. **Integration Tests**: Check for credentials before running
   ```typescript
   const hasCredentials = process.env.SF_CLIENT_ID && ...;
   beforeAll(async () => {
     if (!hasCredentials) return;
     // setup
   });
   ```

3. **Cleanup**: Always clean up test artifacts
   ```typescript
   afterAll(async () => {
     // cleanup code
   });
   ```

### Test Naming

- Use descriptive test names: `should upload file successfully`
- Group related tests with `describe` blocks
- Use `it` for individual test cases

### Assertions

```typescript
// Good
expect(result.contentVersionId).toBeTruthy();
expect(result.contentVersionId).toMatch(/^068/);

// Better - more specific
expect(result).toEqual(expect.objectContaining({
  contentVersionId: expect.stringMatching(/^068/),
  contentDocumentId: expect.stringMatching(/^069/),
}));
```

## Troubleshooting

### Integration Tests Fail

1. **Check credentials**:
   ```bash
   source env.sh
   echo $SF_CLIENT_ID
   ```

2. **Verify LibreOffice**:
   ```bash
   "$SOFFICE_EXE" --version
   ```

3. **Check Salesforce connectivity**:
   ```bash
   npm run verify
   ```

### Unit Tests Fail

1. **Clear Jest cache**:
   ```bash
   npx jest --clearCache
   ```

2. **Rebuild project**:
   ```bash
   npm run build
   ```

### Timeout Errors

Increase timeout for slow operations:
```typescript
it('long running test', async () => {
  // test code
}, 60000); // 60 second timeout
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - name: Install LibreOffice
        run: sudo apt-get install -y libreoffice
      - run: npm install
      - run: npm run test:integration
        env:
          SF_CLIENT_ID: ${{ secrets.SF_CLIENT_ID }}
          SF_CLIENT_SECRET: ${{ secrets.SF_CLIENT_SECRET }}
          SF_LOGIN_URL: ${{ secrets.SF_LOGIN_URL }}
          SOFFICE_EXE: /usr/bin/soffice
```

## Code Coverage

Target coverage goals:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Future Test Additions

Planned test enhancements:
- [ ] Pub/Sub client unit tests
- [ ] Event publisher unit tests
- [ ] Complete e2e test with platform events
- [ ] Performance/load tests
- [ ] Error recovery tests
- [ ] Concurrent conversion tests
- [ ] Large file handling tests
