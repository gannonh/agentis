// All imports are handled via re-exports below

/**
 * Check if email configuration is set
 * @returns {Boolean}
 */
function checkEmailConfig() {
  return (
    (!!process.env.EMAIL_SERVICE || !!process.env.EMAIL_HOST) &&
    !!process.env.EMAIL_USERNAME &&
    !!process.env.EMAIL_PASSWORD &&
    !!process.env.EMAIL_FROM
  );
}

// Re-export all named exports from individual modules
export * from './streamResponse.js';
export * from './crypto.js';
export * from './handleText.js';
export * from './files.js';
export * from './queue.js';

// Re-export default exports with specific names
export { default as countTokens } from './countTokens.js';
export { default as removePorts } from './removePorts.js';
export { default as sendEmail } from './sendEmail.js';
export { default as math } from './math.js';

// Export the local function
export { checkEmailConfig };
