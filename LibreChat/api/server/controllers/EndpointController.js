import { getEndpointsConfig } from '#server/services/Config.js';

async function endpointController(req, res) {
  const endpointsConfig = await getEndpointsConfig(req);
  res.send(JSON.stringify(endpointsConfig));
}

export default endpointController;
