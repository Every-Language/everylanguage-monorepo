// Logging utility for the Bible App
// This provides a centralized way to handle logging with environment-based control
/* eslint-disable no-console */

// Global declaration for React Native __DEV__ variable
declare const __DEV__: boolean;

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote?: boolean;
}

class Logger {
  private config: LogConfig;

  constructor(
    config: LogConfig = { level: LogLevel.INFO, enableConsole: true }
  ) {
    this.config = config;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        // Include any additional properties
        ...Object.getOwnPropertyNames(error).reduce(
          (acc, propName) => {
            if (
              propName !== 'name' &&
              propName !== 'message' &&
              propName !== 'stack'
            ) {
              try {
                acc[propName] = (error as unknown as Record<string, unknown>)[
                  propName
                ];
              } catch {
                acc[propName] = '[Unable to serialize]';
              }
            }
            return acc;
          },
          {} as Record<string, unknown>
        ),
      };
    }
    return { error: String(error) };
  }

  private formatMessage(
    level: string,
    message: string,
    ...args: unknown[]
  ): string {
    const timestamp = new Date().toISOString();
    const formattedArgs =
      args.length > 0
        ? ` ${args
            .map(arg => {
              if (arg instanceof Error) {
                return JSON.stringify(this.serializeError(arg), null, 2);
              }
              if (typeof arg === 'object') {
                // Handle objects that might contain Error instances
                const serialized = JSON.stringify(
                  arg,
                  (_k, value) => {
                    if (value instanceof Error) {
                      return this.serializeError(value);
                    }
                    return value;
                  },
                  2
                );
                return serialized;
              }
              return String(arg);
            })
            .join(' ')}`
        : '';
    return `[${timestamp}] ${level}: ${message}${formattedArgs}`;
  }

  error(shouldLog: boolean, message: string, ...args: unknown[]): void {
    // Always show errors in dev mode, or when explicitly enabled
    const shouldShowError =
      __DEV__ || (shouldLog && this.shouldLog(LogLevel.ERROR));

    if (shouldShowError) {
      const formattedMessage = this.formatMessage('ERROR', message, ...args);
      if (this.config.enableConsole) {
        console.error(formattedMessage);
      }
      // TODO: Send to remote logging service if enabled
    }
  }

  warn(shouldLog: boolean, message: string, ...args: unknown[]): void {
    if (shouldLog && this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage('WARN', message, ...args);
      if (this.config.enableConsole) {
        console.warn(formattedMessage);
      }
    }
  }

  info(shouldLog: boolean, message: string, ...args: unknown[]): void {
    if (shouldLog && this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage('INFO', message, ...args);
      if (this.config.enableConsole) {
        console.info(formattedMessage);
        console.log(this.config);
      }
    }
  }

  debug(shouldLog: boolean, message: string, ...args: unknown[]): void {
    if (shouldLog && this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage('DEBUG', message, ...args);
      if (this.config.enableConsole) {
        console.debug(formattedMessage);
      }
    }
  }

  // Convenience method
  log(shouldLog: boolean, message: string, ...args: unknown[]): void {
    this.info(shouldLog, message, ...args);
  }

  setConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LogConfig {
    return { ...this.config };
  }
}

// Create default logger instance
export const logger = new Logger({
  level: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
});

// Export individual log methods for convenience
export const { error, warn, info, debug, log } = logger;

// Export logger instance for advanced usage
export default logger;
