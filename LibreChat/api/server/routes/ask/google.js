import express from 'express';
import AskController from '#server/controllers/AskController.js';
import initializeClient from '#server/services/Endpoints/google/initialize.js';
import addTitle from '#server/services/Endpoints/google/title.js';
import {
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
    await AskController(req, res, next, initializeClient, addTitle);
  },
);

export default router;
