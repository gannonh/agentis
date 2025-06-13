import express from 'express';

const router = express.Router();
import { 
  setHeaders,
  handleAbort,
  moderateText,
  // validateModel,
  // validateEndpoint,
  buildEndpointOption,
 } from '#server/middleware.js';
import { initializeClient } from '#server/services/Endpoints/bedrock/initialize.js';
import AgentController from '#server/controllers/agents/request.js';
import addTitle from '#server/services/Endpoints/agents/title.js';

router.use(moderateText);

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
  // validateModel,
  // validateEndpoint,
  buildEndpointOption,
  setHeaders,
  async (req, res, next) => {
    await AgentController(req, res, next, initializeClient, addTitle);
  },
);

export default router;
