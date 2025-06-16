import express from 'express';

const router = express.Router();
import {
  setHeaders,
  handleAbort,
  validateModel,
  // validateEndpoint,
  buildEndpointOption,
} from '#server/middleware.js';
import validateConvoAccess from '#server/middleware/validate/convoAccess.js';
import validateAssistant from '#server/middleware/assistants/validate.js';
import chatController from '#server/controllers/assistants/chatV1.js';

router.post('/abort', handleAbort());

/**
 * @route POST /
 * @desc Chat with an assistant
 * @access Public
 * @param {express.Request} req - The request object, containing the request data.
 * @param {express.Response} res - The response object, used to send back a response.
 * @returns {void}
 */
router.post(
  '/',
  validateModel,
  buildEndpointOption,
  validateAssistant,
  validateConvoAccess,
  setHeaders,
  chatController,
);

export default router;
