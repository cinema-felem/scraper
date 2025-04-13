/**
 * Centralized logging utility that funnels all console messages to Sentry
 * Replaces standard console methods with enhanced versions that also report to Sentry
 * Includes performance monitoring, transactions, and data flow tracking
 */
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

enum Severity {
  Fatal = 'fatal',
  Error = 'error',
  Warning = 'warning',
  Log = 'log',
  Info = 'info',
  Debug = 'debug',
}

// Store original console methods to prevent infinite recursion
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
}

/**
 * Logger class that extends console functionality with Sentry integration
 * @class Logger
 */
/**
 * Data count metrics interface for tracking the number of records at different stages
 */
export interface DataCountMetrics {
  stage: string;
  movieCount?: number;
  cinemaCount?: number;
  showtimeCount?: number;
  source?: string;
  details?: Record<string, any>;
}

class Logger {
  /**
   * Log an informational message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  info(message: string, ...args: any[]): void {
    this.captureMessage(message, args, Severity.Info)
    originalConsole.info(message, ...args)
  }

  /**
   * Log a debug message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  debug(message: string, ...args: any[]): void {
    this.captureMessage(message, args, Severity.Debug)
    originalConsole.debug(message, ...args)
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  warn(message: string, ...args: any[]): void {
    this.captureMessage(message, args, Severity.Warning)
    originalConsole.warn(message, ...args)
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  error(message: string, ...args: any[]): void {
    try {
      // Check if the first argument after message is an Error object
      if (args.length > 0 && args[0] instanceof Error) {
        const error = args[0]
        Sentry.captureException(error, {
          extra: {
            message,
            additionalArgs: args.slice(1),
          },
        })
      } else {
        this.captureMessage(message, args, Severity.Error)
      }
      // Use original console to prevent infinite recursion
      originalConsole.error(message, ...args)
    } catch (err) {
      // Fallback if Sentry throws an error to prevent infinite recursion
      originalConsole.error('Error in logger.error:', err)
      originalConsole.error('Original error message:', message, ...args)
    }
  }

  /**
   * Log a message (equivalent to console.log)
   * @param {string} message - The message to log
   * @param {...any} args - Additional arguments to log
   */
  log(message: string, ...args: any[]): void {
    this.captureMessage(message, args, Severity.Info)
    originalConsole.log(message, ...args)
  }

  /**
   * Track data count metrics to monitor data flow through the pipeline
   * @param {DataCountMetrics} metrics - The metrics to track
   */
  trackDataCounts(metrics: DataCountMetrics): void {
    try {
      const { stage, movieCount, cinemaCount, showtimeCount, source, details } = metrics;
      
      // Add a breadcrumb for data count tracking
      Sentry.addBreadcrumb({
        category: 'data-flow',
        message: `${stage} data counts`,
        level: 'info',
        data: {
          stage,
          movieCount,
          cinemaCount,
          showtimeCount,
          source,
          timestamp: new Date().toISOString()
        }
      });
      
      // Also log to console
      const countInfo = [
        movieCount !== undefined ? `${movieCount} movies` : '',
        cinemaCount !== undefined ? `${cinemaCount} cinemas` : '',
        showtimeCount !== undefined ? `${showtimeCount} showtimes` : ''
      ].filter(Boolean).join(', ');
      
      const sourceInfo = source ? ` from ${source}` : '';
      originalConsole.info(`[${stage}] Processing ${countInfo}${sourceInfo}`);
      
      // Set metrics in Sentry
      if (movieCount !== undefined) Sentry.setTag(`${stage}.movie_count`, movieCount);
      if (cinemaCount !== undefined) Sentry.setTag(`${stage}.cinema_count`, cinemaCount);
      if (showtimeCount !== undefined) Sentry.setTag(`${stage}.showtime_count`, showtimeCount);
      if (source) Sentry.setTag(`${stage}.source`, source);
      
      // Include additional details if provided
      if (details) {
        Sentry.setContext(`${stage}_details`, details);
      }
    } catch (err) {
      originalConsole.error('Error tracking data counts:', err);
    }
  }

  /**
   * Start a performance transaction for tracking function or process execution
   * @param {string} name - The name of the transaction
   * @param {string} operation - The operation type (e.g., 'scrape', 'transform')
   * @param {Record<string, any>} metadata - Additional metadata for the transaction
   * @returns {object} The created transaction
   */
  startTransaction(name: string, operation: string, metadata: Record<string, any> = {}): any {
    try {
      // Create a transaction tag for future events
      try {
        const scope = Sentry.getCurrentHub().getScope();
        if (scope) {
          scope.setTag('transaction_name', name);
          scope.setTag('transaction_op', operation);
          
          // Add metadata as context
          if (Object.keys(metadata).length > 0) {
            scope.setContext('transaction_data', metadata);
          }
        }
      } catch (err) {
        originalConsole.error('Error setting transaction scope:', err);
      }
      
      // Add a breadcrumb for the transaction start
      Sentry.addBreadcrumb({
        category: 'transaction',
        message: `Started transaction: ${name}`,
        data: {
          ...metadata,
          operation,
          timestamp: new Date().toISOString()
        },
        level: 'info'
      });
      
      // Return a simple transaction object that can be used to finish the transaction
      return {
        name,
        operation,
        metadata,
        startTime: Date.now(),
        finish: function() {
          const duration = Date.now() - this.startTime;
          Sentry.addBreadcrumb({
            category: 'transaction',
            message: `Finished transaction: ${name}`,
            data: {
              ...metadata,
              operation,
              duration,
              timestamp: new Date().toISOString()
            },
            level: 'info'
          });
          
          // Set duration metric
          Sentry.setTag(`${name}.duration_ms`, duration);
        },
        startChild: (childName: string) => {
          Sentry.addBreadcrumb({
            category: 'span',
            message: `Started span: ${childName}`,
            data: {
              parent: name,
              operation,
              timestamp: new Date().toISOString()
            },
            level: 'info'
          });
          
          const childStartTime = Date.now();
          return {
            name: childName,
            finish: () => {
              const childDuration = Date.now() - childStartTime;
              Sentry.addBreadcrumb({
                category: 'span',
                message: `Finished span: ${childName}`,
                data: {
                  parent: name,
                  operation,
                  duration: childDuration,
                  timestamp: new Date().toISOString()
                },
                level: 'info'
              });
              
              // Set span duration metric
              Sentry.setTag(`${name}.${childName}_duration_ms`, childDuration);
            }
          };
        }
      };
    } catch (err) {
      originalConsole.error('Error starting transaction:', err);
      // Return a dummy transaction to prevent errors
      return {
        finish: () => {},
        startChild: () => ({ finish: () => {} }),
      } as any;
    }
  }

  /**
   * Add a breadcrumb to track program flow
   * @param {string} category - Breadcrumb category
   * @param {string} message - Breadcrumb message
   * @param {Record<string, any>} data - Additional data
   */
  addBreadcrumb(category: string, message: string, data: Record<string, any> = {}): void {
    try {
      Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info'
      });
    } catch (err) {
      originalConsole.error('Error adding breadcrumb:', err);
    }
  }

  /**
   * Capture a message in Sentry with the specified severity level
   * @param {string} message - The message to capture
   * @param {any[]} args - Additional arguments to include as context
   * @param {Severity} level - The severity level of the message
   * @private
   */
  private captureMessage(message: string, args: any[], level: Severity): void {
    // Only send to Sentry if it's initialized
    if (process.env.SENTRY_DSN) {
      try {
        let context: Record<string, any> = {};

        // Process arguments to make them serializable
        if (args.length > 0) {
          context.args = args.map(arg => {
            if (arg instanceof Error) {
              return {
                name: arg.name,
                message: arg.message,
                stack: arg.stack,
              }
            }
            return arg
          })
        }

        Sentry.captureMessage(message, {
          level,
          extra: context,
        })
      } catch (err) {
        // Fallback if Sentry throws an error to prevent infinite recursion
        originalConsole.error('Error in captureMessage:', err)
      }
    }
  }
}

// Create and export a singleton instance
const logger = new Logger()
export default logger

/**
 * Override the global console object with our logger
 * This ensures all existing console.log calls will be captured by Sentry
 * @returns {Object} The original console methods
 */
export function overrideConsole(): Record<string, (...args: any[]) => void> {
  // Override console methods
  console.log = function (message: any, ...args: any[]): void {
    logger.log(message, ...args)
  }

  console.info = function (message: any, ...args: any[]): void {
    logger.info(message, ...args)
  }

  console.warn = function (message: any, ...args: any[]): void {
    logger.warn(message, ...args)
  }

  console.error = function (message: any, ...args: any[]): void {
    logger.error(message, ...args)
  }

  console.debug = function (message: any, ...args: any[]): void {
    logger.debug(message, ...args)
  }

  return originalConsole
}

/**
 * Initialize Sentry with the provided DSN and options
 * @param {object} options - Additional Sentry initialization options
 */
export function initSentry(options: Record<string, any> = {}): void {
  if (!process.env.SENTRY_DSN) {
    originalConsole.warn(
      'SENTRY_DSN environment variable not set. Sentry will not be initialized.',
    )
    return
  }

  try {
    // Get environment from ENV or default to development
    const environment = process.env.NODE_ENV || 'development';
    
    // Get release version from package.json if available
    let release;
    try {
      // In production, this would typically be set by the build process
      release = process.env.SENTRY_RELEASE || 'cinema-scraper@1.0.0';
    } catch (e) {
      release = 'cinema-scraper@unknown';
    }

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment,
      release,
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      integrations: [
        // Enable performance profiling
        nodeProfilingIntegration(),
      ],
      // Capture 100% of transactions for monitoring data flow
      tracesSampler: context => {
        // Always sample scraper, transformer, and metadata transactions
        const transactionName = context.transactionContext?.name || '';
        if (transactionName.includes('scrape') ||
            transactionName.includes('transform') ||
            transactionName.includes('metadata') ||
            transactionName.includes('storage')) {
          return 1.0;
        }
        // Default sample rate from options or 20%
        return options.tracesSampleRate ?? 0.2;
      },
      beforeSend(event) {
        // Add processing stage to all events based on tags
        if (event && event.tags) {
          // Use the transaction tags if available
          const transactionName = event.tags.transaction_name || 'unknown';
          const transactionOp = event.tags.transaction_op || 'unknown';
          
          event.tags.processing_stage = transactionName;
          event.tags.operation = transactionOp;
        }
        return event;
      },
      ...options,
    })

    // Override console methods to funnel through Sentry
    overrideConsole()
    
    // Set some global tags
    Sentry.setTag('service', options.initialScope?.tags?.service || 'cinema-scraper');
    Sentry.setTag('process_id', process.pid.toString());
    
    originalConsole.info(`Sentry initialized for ${options.initialScope?.tags?.service || 'cinema-scraper'} service`);
  } catch (err) {
    originalConsole.error('Failed to initialize Sentry:', err)
  }
}
