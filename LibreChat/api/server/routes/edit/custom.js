import express from 'express';
import EditController from '#server/controllers/EditController.js';
import initializeClient from '#server/services/Endpoints/custom/initialize.js';
import addTitle from '#server/services/Endpoints/openAI/title.js';
import {
  handleAbort,
  setHeaders,
  validateModel,
  validateEndpoint,
  buildEndpointOption,
} from '#server/middleware.js';

const router = express.Router();

router.post(
  '/',
  validateEndpoint,
  validateModel,
  buildEndpointOption,
  setHeaders,
  async (req, res, next) => {
    await EditController(req, res, next, initializeClient, addTitle);
  },
);

export default router;
