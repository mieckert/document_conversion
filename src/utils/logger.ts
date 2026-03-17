/**
 * Simple logging utility with timestamps
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  info(message: string, ...args: any[]): void {
    console.log(`[${this.timestamp()}] [${this.context}] ${message}`, ...args);
  }

  error(message: string, error?: any): void {
    console.error(`[${this.timestamp()}] [${this.context}] ERROR: ${message}`);
    if (error) {
      console.error(error);
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.timestamp()}] [${this.context}] WARN: ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[${this.timestamp()}] [${this.context}] DEBUG: ${message}`, ...args);
  }
}
