import assert from 'assert';
import httpClient from './http-client'; // Assuming default export
import logger from './logger'; // Import the actual logger

// Store original fetch and logger methods
const originalFetch = global.fetch;
const originalLoggerError = logger.error;

// Mock store for logger
let mockLoggerOutput: string[] = [];

describe('httpClient', () => {
  let fetchCalledWith: { url: string; options: RequestInit | undefined };

  beforeEach(() => {
    fetchCalledWith = { url: '', options: undefined };
    mockLoggerOutput = []; // Reset logger output for each test

    // Mock global.fetch
    global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
      fetchCalledWith.url = url.toString();
      fetchCalledWith.options = options;
      // Default mock response: success
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
        text: async () => 'Success response text',
      } as Response;
    };

    // Mock logger.error
    logger.error = (message: string) => {
      mockLoggerOutput.push(message);
    };
  });

  afterEach(() => {
    // Restore original fetch and logger
    global.fetch = originalFetch;
    logger.error = originalLoggerError;
  });

  it('should make a GET request with default headers successfully', async () => {
    const result = await httpClient<{ data: string }>('https://example.com');
    assert.deepStrictEqual(result, { data: 'success' });
    assert.strictEqual(fetchCalledWith.url, 'https://example.com');
    assert.ok(fetchCalledWith.options);
    assert.strictEqual(fetchCalledWith.options?.method, undefined); // Default is GET

    const headers = fetchCalledWith.options?.headers as Record<string, string>;
    assert.strictEqual(headers['accept-language'], 'en-US,en;q=0.9');
    assert.ok(headers['user-agent']); // Check if user-agent exists
  });

  it('should allow overriding default headers and adding new ones', async () => {
    await httpClient('https://example.com', {
      method: 'POST',
      headers: {
        'accept-language': 'de-DE',
        'x-custom-header': 'custom-value',
      },
      body: JSON.stringify({ message: 'hello' }),
    });

    assert.strictEqual(fetchCalledWith.options?.method, 'POST');
    const headers = fetchCalledWith.options?.headers as Record<string, string>;
    assert.strictEqual(headers['accept-language'], 'de-DE');
    assert.strictEqual(headers['x-custom-header'], 'custom-value');
    assert.ok(headers['user-agent']);
    assert.strictEqual(fetchCalledWith.options?.body, JSON.stringify({ message: 'hello' }));
  });

  it('should handle network errors (fetch throws)', async () => {
    global.fetch = async () => {
      throw new Error('Network failure');
    };

    await assert.rejects(
      httpClient('https://example.com'),
      /Network failure/, // The re-thrown error message will be "Network failure"
    );
    assert.strictEqual(mockLoggerOutput.length, 1);
    assert.ok(mockLoggerOutput[0].includes('Error during HTTP request to https://example.com: Error: Network failure'));
  });

  it('should handle non-successful HTTP status codes', async () => {
    global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'not found' }), // some APIs send JSON errors
        text: async () => 'Resource not found',
      } as Response;
    };

    await assert.rejects(
      httpClient('https://example.com/notfound'),
      /HTTP request to https:\/\/example.com\/notfound failed with status 404/,
    );
    assert.strictEqual(mockLoggerOutput.length, 2, "Logger should have been called for the HTTP error and the subsequent catch block error"); // httpClient logs the HTTP error, then logs the re-thrown error
    assert.ok(mockLoggerOutput[0].includes('HTTP request to https://example.com/notfound failed with status 404: Resource not found'));
    assert.ok(mockLoggerOutput[1].includes('Error during HTTP request to https://example.com/notfound: Error: HTTP request to https://example.com/notfound failed with status 404'));
  });

  it('should handle non-Error objects thrown during fetch', async () => {
    global.fetch = async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'fetch failed as string';
    };
    await assert.rejects(
        httpClient('https://example.com/unknownerror'),
        /An unknown error occurred during the HTTP request to https:\/\/example.com\/unknownerror./
    );
    assert.strictEqual(mockLoggerOutput.length, 1);
    assert.ok(mockLoggerOutput[0].includes('Error during HTTP request to https://example.com/unknownerror: fetch failed as string'));
  });
});
