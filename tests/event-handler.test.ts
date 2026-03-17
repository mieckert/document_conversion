import { EventHandler } from '../src/pubsub/event-handler';

describe('EventHandler', () => {
  let eventHandler: EventHandler;

  beforeEach(() => {
    eventHandler = new EventHandler();
  });

  describe('parseConvertRequest', () => {
    it('should parse valid event with all fields', () => {
      const rawEvent = {
        sourceContentVersionId__c: '068xx000000001',
        convertTo__c: 'pdf',
        continuationSObjectType__c: 'Account',
        continuationRecordId__c: '001xx000000001',
        continuationData__c: 'test-data',
      };

      const result = eventHandler.parseConvertRequest(rawEvent);

      expect(result.sourceContentVersionId__c).toBe('068xx000000001');
      expect(result.convertTo__c).toBe('pdf');
      expect(result.continuationSObjectType__c).toBe('Account');
      expect(result.continuationRecordId__c).toBe('001xx000000001');
      expect(result.continuationData__c).toBe('test-data');
    });

    it('should parse valid event with required fields only', () => {
      const rawEvent = {
        sourceContentVersionId__c: '068xx000000001',
        convertTo__c: 'pdf',
      };

      const result = eventHandler.parseConvertRequest(rawEvent);

      expect(result.sourceContentVersionId__c).toBe('068xx000000001');
      expect(result.convertTo__c).toBe('pdf');
      expect(result.continuationSObjectType__c).toBeUndefined();
      expect(result.continuationRecordId__c).toBeUndefined();
      expect(result.continuationData__c).toBeUndefined();
    });

    it('should throw error when sourceContentVersionId__c is missing', () => {
      const rawEvent = {
        convertTo__c: 'pdf',
      };

      expect(() => {
        eventHandler.parseConvertRequest(rawEvent);
      }).toThrow('Missing required field: sourceContentVersionId__c');
    });

    it('should throw error when convertTo__c is missing', () => {
      const rawEvent = {
        sourceContentVersionId__c: '068xx000000001',
      };

      expect(() => {
        eventHandler.parseConvertRequest(rawEvent);
      }).toThrow('Missing required field: convertTo__c');
    });
  });

  describe('isValidFormat', () => {
    it('should accept valid formats', () => {
      const validFormats = ['pdf', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'txt', 'html'];

      validFormats.forEach(format => {
        expect(eventHandler.isValidFormat(format)).toBe(true);
      });
    });

    it('should accept valid formats in uppercase', () => {
      expect(eventHandler.isValidFormat('PDF')).toBe(true);
      expect(eventHandler.isValidFormat('DOCX')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(eventHandler.isValidFormat('invalid')).toBe(false);
      expect(eventHandler.isValidFormat('exe')).toBe(false);
      expect(eventHandler.isValidFormat('')).toBe(false);
    });
  });
});
