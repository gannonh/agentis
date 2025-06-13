import express from 'express';
import AskController from '#server/controllers/AskController.js';
import { addTitle, initializeClient } from '#server/services/Endpoints/openAI/index.js';
import {
  handleAbort,
  setHeaders,
  validateModel,
  validateEndpoint,
  buildEndpointOption,
  moderateText,
} from '#server/middleware/index.js';

const router = express.Router();
router.use(moderateText);

router.post(
  '/',
  validateEndpoint,
  validateModel,
  buildEndpointOption,
  setHeaders,
  async (req, res, next) => {
    await AskController(req, res, next, initializeClient, addTitle);
  },
);

export default router;
