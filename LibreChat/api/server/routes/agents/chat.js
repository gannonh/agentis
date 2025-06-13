import express from 'express';
import {  PermissionTypes, Permissions  } from 'librechat-data-provider';
import { 
  setHeaders,
  moderateText,
  // validateModel,
  generateCheckAccess,
  validateConvoAccess,
  buildEndpointOption,
 } from '#server/middleware.js';
import { initializeClient } from '#server/services/Endpoints/agents/initialize.js';
import AgentController from '#server/controllers/agents/request.js';
import addTitle from '#server/services/Endpoints/agents/title.js';

const router = express.Router();

router.use(moderateText);

const checkAgentAccess = generateCheckAccess(PermissionTypes.AGENTS, [Permissions.USE]);

router.use(checkAgentAccess);
router.use(validateConvoAccess);
router.use(buildEndpointOption);
router.use(setHeaders);

const controller = async (req, res, next) => {
  await AgentController(req, res, next, initializeClient, addTitle);
};

/**
 * @route POST / (regular endpoint)
 * @desc Chat with an assistant
 * @access Public
 * @param {express.Request} req - The request object, containing the request data.
 * @param {express.Response} res - The response object, used to send back a response.
 * @returns {void}
 */
router.post('/', controller);

/**
 * @route POST /:endpoint (ephemeral agents)
 * @desc Chat with an assistant
 * @access Public
 * @param {express.Request} req - The request object, containing the request data.
 * @param {express.Response} res - The response object, used to send back a response.
 * @returns {void}
 */
router.post('/:endpoint', controller);

export default router;
