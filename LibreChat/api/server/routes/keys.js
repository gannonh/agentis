import express from 'express';
const router = express.Router();
import {  updateUserKey, deleteUserKey, getUserKeyExpiry  } from '../services/UserService.js';
import { requireBetterAuth } from '../middleware/index.js';

router.put('/', requireBetterAuth, async (req, res) => {
  await updateUserKey({ userId: req.user.id, ...req.body });
  res.status(201).send();
});

router.delete('/:name', requireBetterAuth, async (req, res) => {
  const { name } = req.params;
  await deleteUserKey({ userId: req.user.id, name });
  res.status(204).send();
});

router.delete('/', requireBetterAuth, async (req, res) => {
  const { all } = req.query;

  if (all !== 'true') {
    return res.status(400).send({ error: 'Specify either all=true to delete.' });
  }

  await deleteUserKey({ userId: req.user.id, all: true });

  res.status(204).send();
});

router.get('/', requireBetterAuth, async (req, res) => {
  const { name } = req.query;
  const response = await getUserKeyExpiry({ userId: req.user.id, name });
  res.status(200).send(response);
});

export default router;
