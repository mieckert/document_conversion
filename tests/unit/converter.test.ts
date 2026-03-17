import { LibreOfficeConverter } from '../../src/conversion/libreoffice-converter';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Mock child_process and fs
jest.mock('child_process');
jest.mock('fs');

const mockedExec = exec as unknown as jest.Mock;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('LibreOfficeConverter', () => {
  let converter: LibreOfficeConverter;
  const mockSofficeExe = '/usr/bin/soffice';

  beforeEach(() => {
    converter = new LibreOfficeConverter(mockSofficeExe);
    jest.clearAllMocks();
  });

  describe('verify', () => {
    it('should return true when LibreOffice is available', async () => {
      mockedExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, { stdout: 'LibreOffice 7.0.0', stderr: '' });
        return {} as any;
      });

      const result = await converter.verify();

      expect(result).toBe(true);
      expect(mockedExec).toHaveBeenCalledWith(
        expect.stringContaining('--version'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should return false when LibreOffice is not available', async () => {
      mockedExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(new Error('Command not found'));
        return {} as any;
      });

      const result = await converter.verify();

      expect(result).toBe(false);
    });
  });

  describe('convertDocument', () => {
    it('should convert document successfully', async () => {
      const inputBuffer = Buffer.from('test input data');
      const inputFilename = 'test.xlsx';
      const convertTo = 'pdf';
      const outputContent = Buffer.from('converted pdf data');

      // Mock temp directory operations
      mockedFs.mkdtempSync.mockReturnValue('/tmp/test-temp-dir');
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(outputContent);
      mockedFs.rmSync.mockImplementation(() => {});

      // Mock exec to simulate successful conversion
      mockedExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, { stdout: 'convert /tmp/test-temp-dir/test.xlsx -> /tmp/test-temp-dir/test.pdf using filter : calc_pdf_Export', stderr: '' });
        return {} as any;
      });

      const result = await converter.convertDocument(inputBuffer, inputFilename, convertTo);

      expect(result.buffer).toEqual(outputContent);
      expect(result.filename).toBe('test.pdf');

      // Verify file operations
      expect(mockedFs.mkdtempSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test.xlsx'),
        inputBuffer
      );
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test.pdf')
      );
      expect(mockedFs.rmSync).toHaveBeenCalled();
    });

    it('should handle conversion errors', async () => {
      const inputBuffer = Buffer.from('test data');

      mockedFs.mkdtempSync.mockReturnValue('/tmp/test-temp-dir');
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.rmSync.mockImplementation(() => {});

      // Mock exec to simulate conversion failure
      mockedExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(new Error('Conversion failed'));
        return {} as any;
      });

      await expect(
        converter.convertDocument(inputBuffer, 'test.xlsx', 'pdf')
      ).rejects.toThrow('LibreOffice conversion failed');

      // Verify cleanup still happens
      expect(mockedFs.rmSync).toHaveBeenCalled();
    });

    it('should handle missing output file', async () => {
      const inputBuffer = Buffer.from('test data');

      mockedFs.mkdtempSync.mockReturnValue('/tmp/test-temp-dir');
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValue(false); // Output file doesn't exist
      mockedFs.rmSync.mockImplementation(() => {});

      mockedExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      await expect(
        converter.convertDocument(inputBuffer, 'test.xlsx', 'pdf')
      ).rejects.toThrow('output file not found');

      expect(mockedFs.rmSync).toHaveBeenCalled();
    });

    it('should clean up temp directory on success', async () => {
      const inputBuffer = Buffer.from('test');
      const outputContent = Buffer.from('converted');

      mockedFs.mkdtempSync.mockReturnValue('/tmp/test-temp-dir');
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(outputContent);
      mockedFs.rmSync.mockImplementation(() => {});

      mockedExec.mockImplementation((cmd: string, options: any, callback: any) => {
        callback(null, { stdout: 'success', stderr: '' });
        return {} as any;
      });

      await converter.convertDocument(inputBuffer, 'test.docx', 'pdf');

      expect(mockedFs.rmSync).toHaveBeenCalledWith(
        '/tmp/test-temp-dir',
        expect.objectContaining({ recursive: true, force: true })
      );
    });

    it('should handle different file formats', async () => {
      const testCases = [
        { input: 'test.docx', format: 'pdf', expected: 'test.pdf' },
        { input: 'test.xlsx', format: 'csv', expected: 'test.csv' },
        { input: 'test.pptx', format: 'pdf', expected: 'test.pdf' },
        { input: 'document.odt', format: 'docx', expected: 'document.docx' },
      ];

      for (const testCase of testCases) {
        mockedFs.mkdtempSync.mockReturnValue('/tmp/test');
        mockedFs.writeFileSync.mockImplementation(() => {});
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readFileSync.mockReturnValue(Buffer.from('converted'));
        mockedFs.rmSync.mockImplementation(() => {});

        mockedExec.mockImplementation((cmd: string, options: any, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
          return {} as any;
        });

        const result = await converter.convertDocument(
          Buffer.from('test'),
          testCase.input,
          testCase.format
        );

        expect(result.filename).toBe(testCase.expected);
      }
    });
  });

  describe('Command Construction', () => {
    it('should construct correct LibreOffice command', async () => {
      const inputBuffer = Buffer.from('test');
      const outputContent = Buffer.from('output');

      mockedFs.mkdtempSync.mockReturnValue('/tmp/test-dir');
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(outputContent);
      mockedFs.rmSync.mockImplementation(() => {});

      mockedExec.mockImplementation((cmd: string, options: any, callback: any) => {
        // Verify command structure
        expect(cmd).toContain('--headless');
        expect(cmd).toContain('--convert-to pdf');
        expect(cmd).toContain('--outdir');

        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      await converter.convertDocument(inputBuffer, 'test.docx', 'pdf');

      expect(mockedExec).toHaveBeenCalled();
    });
  });
});
