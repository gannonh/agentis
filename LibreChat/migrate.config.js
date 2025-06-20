/**
 * @fileoverview Better Auth migration configuration
 * @module migrate.config
 */

import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { organization } from 'better-auth/plugins';
import mongoose from 'mongoose';

// Simple config for migrations only
export const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection.getClient(), {
    databaseName: process.env.MONGO_URI?.split('/').pop()?.split('?')[0] || 'Agentis',
  }),
  
  secret: process.env.BETTER_AUTH_SECRET || 'fallback-secret-for-migration',
  
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
    }),
  ],
  
  // Minimal config for migration purposes
  emailAndPassword: {
    enabled: true,
  },
});

export default auth; 