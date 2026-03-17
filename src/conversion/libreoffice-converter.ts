import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * LibreOffice Document Converter
 * Converts documents using LibreOffice command-line interface
 */
export class LibreOfficeConverter {
  private sofficeExe: string;

  constructor(sofficeExe: string) {
    this.sofficeExe = sofficeExe;
  }

  /**
   * Convert a document to the specified format
   * @param inputBuffer - File content as Buffer
   * @param inputFilename - Original filename with extension
   * @param convertTo - Target format (e.g., 'pdf', 'docx', 'xlsx')
   * @returns Converted file as Buffer
   */
  async convertDocument(
    inputBuffer: Buffer,
    inputFilename: string,
    convertTo: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    let tempDir: string | null = null;
    let inputPath: string | null = null;

    try {
      // Create temporary directory
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'libreoffice-convert-'));
      console.log(`[Converter] Created temp directory: ${tempDir}`);

      // Write input file to temp directory
      inputPath = path.join(tempDir, inputFilename);
      fs.writeFileSync(inputPath, inputBuffer);
      console.log(`[Converter] Wrote input file: ${inputPath}`);

      // Build LibreOffice command
      const command = `"${this.sofficeExe}" --headless --convert-to ${convertTo} "${inputPath}" --outdir "${tempDir}"`;
      console.log(`[Converter] Executing: ${command}`);

      // Execute conversion
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
      });

      if (stdout) console.log(`[Converter] stdout: ${stdout}`);
      if (stderr) console.log(`[Converter] stderr: ${stderr}`);

      // Determine output filename
      const inputBasename = path.basename(inputFilename, path.extname(inputFilename));
      const outputFilename = `${inputBasename}.${convertTo}`;
      const outputPath = path.join(tempDir, outputFilename);

      // Check if output file exists
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Conversion failed: output file not found at ${outputPath}`);
      }

      // Read converted file
      const outputBuffer = fs.readFileSync(outputPath);
      console.log(`[Converter] Conversion successful: ${outputBuffer.length} bytes`);

      return {
        buffer: outputBuffer,
        filename: outputFilename,
      };
    } catch (error: any) {
      console.error('[Converter] Conversion failed:', error.message);
      throw new Error(`LibreOffice conversion failed: ${error.message}`);
    } finally {
      // Clean up temp directory
      if (tempDir) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log(`[Converter] Cleaned up temp directory: ${tempDir}`);
        } catch (cleanupError: any) {
          console.warn(`[Converter] Failed to clean up temp directory: ${cleanupError.message}`);
        }
      }
    }
  }

  /**
   * Verify that LibreOffice is available and executable
   */
  async verify(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`"${this.sofficeExe}" --version`, {
        timeout: 5000,
      });
      console.log(`[Converter] LibreOffice version: ${stdout.trim()}`);
      return true;
    } catch (error: any) {
      console.error('[Converter] LibreOffice verification failed:', error.message);
      return false;
    }
  }
}
