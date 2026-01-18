
/**
 * Revolut Merchant API configuration
 * This config is ONLY for Merchant API (payments / checkout)
 */

export type RevolutEnvironment = 'sandbox' | 'production';

export const revolutEnv: RevolutEnvironment =
  (process.env.REVOLUT_ENV as RevolutEnvironment) || 'production';

/**
 * Base URLs for Revolut Merchant API
 */
const BASE_URLS: Record<RevolutEnvironment, string> = {
  sandbox: 'https://sandbox-merchant.revolut.com',
  production: 'https://merchant.revolut.com',
};

/**
 * Main Revolut configuration object
 */
export const revolutConfig = {
  env: revolutEnv,

  baseUrl:
    process.env.REVOLUT_MERCHANT_BASE_URL || BASE_URLS[revolutEnv],

  secretKey: process.env.REVOLUT_MERCHANT_SECRET_KEY,

  webhookSecret: process.env.REVOLUT_WEBHOOK_SECRET,

  defaultCurrency: process.env.REVOLUT_DEFAULT_CURRENCY || 'USD',

  requestTimeout: Number(
    process.env.REVOLUT_REQUEST_TIMEOUT || 30000
  ),

  retryAttempts: Number(
    process.env.REVOLUT_RETRY_ATTEMPTS || 3
  ),

  retryDelay: Number(
    process.env.REVOLUT_RETRY_DELAY || 1000
  ),
};

/**
 * Validate required Revolut environment variables
 * Call this once at app startup or inside API routes
 */
export const validateRevolutConfig = (): void => {
  if (!revolutConfig.secretKey) {
    throw new Error(
      '❌ REVOLUT_MERCHANT_SECRET_KEY is missing'
    );
  }

  if (!revolutConfig.baseUrl) {
    throw new Error(
      '❌ REVOLUT_MERCHANT_BASE_URL is missing'
    );
  }

  if (!revolutConfig.webhookSecret) {
    console.warn(
      '⚠️ REVOLUT_WEBHOOK_SECRET is not set — webhook verification disabled'
    );
  }
};

/**
 * Helper flags
 */
export const isSandbox = revolutEnv === 'sandbox';
export const isProduction = revolutEnv === 'production';

/**
 * Always use this helper to get Revolut base URL
 */
export const getRevolutBaseUrl = (): string => {
  return BASE_URLS[revolutEnv];
};
