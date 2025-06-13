import express from 'express';
import {  uaParser, checkBan, requireJwtAuth, createFileLimiters  } from '#server/middleware.js';
import { avatar as asstAvatarRouter } from '#server/routes/assistants/v1.js';
import { avatar as agentAvatarRouter } from '#server/routes/agents/v1.js';
import {  createMulterInstance  } from './multer.js';

import files from './files.js';
import images from './images.js';
import avatar from './avatar.js';
import speech from './speech.js';

const initialize = async () => {
  const router = express.Router();
  router.use(requireJwtAuth);
  router.use(checkBan);
  router.use(uaParser);

  const upload = await createMulterInstance();
  router.post('/speech/stt', upload.single('audio'));

  /* Important: speech route must be added before the upload limiters */
  router.use('/speech', speech);

  const { fileUploadIpLimiter, fileUploadUserLimiter } = createFileLimiters();
  router.post('*', fileUploadIpLimiter, fileUploadUserLimiter);
  router.post('/', upload.single('file'));
  router.post('/images', upload.single('file'));
  router.post('/images/avatar', upload.single('file'));
  router.post('/images/agents/:agent_id/avatar', upload.single('file'));
  router.post('/images/assistants/:assistant_id/avatar', upload.single('file'));

  router.use('/', files);
  router.use('/images', images);
  router.use('/images/avatar', avatar);
  router.use('/images/agents', agentAvatarRouter);
  router.use('/images/assistants', asstAvatarRouter);
  return router;
};

export { initialize };
