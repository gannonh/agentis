import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  root: path.resolve(__dirname, '..', '..'),
  uploads: path.resolve(__dirname, '..', '..', 'uploads'),
  clientPath: path.resolve(__dirname, '..', '..', 'client'),
  dist: path.resolve(__dirname, '..', '..', 'client', 'dist'),
  publicPath: path.resolve(__dirname, '..', '..', 'client', 'public'),
  fonts: path.resolve(__dirname, '..', '..', 'client', 'public', 'fonts'),
  assets: path.resolve(__dirname, '..', '..', 'client', 'public', 'assets'),
  imageOutput: path.resolve(__dirname, '..', '..', 'client', 'public', 'images'),
  structuredTools: path.resolve(__dirname, '..', 'app', 'clients', 'tools', 'structured'),
  pluginManifest: path.resolve(__dirname, '..', 'app', 'clients', 'tools', 'manifest.json'),
};
