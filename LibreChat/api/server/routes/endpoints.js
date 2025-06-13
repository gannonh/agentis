import express from 'express';
const router = express.Router();
import endpointController from '#server/controllers/EndpointController.js';
import overrideController from '#server/controllers/OverrideController.js';

router.get('/', endpointController);
router.get('/config/override', overrideController);

export default router;
