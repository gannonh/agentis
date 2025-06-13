import fs from 'fs';
import yaml from 'js-yaml';

function loadYaml(filepath) {
  try {
    let fileContents = fs.readFileSync(filepath, 'utf8');
    return yaml.load(fileContents);
  } catch (e) {
    return e;
  }
}

export default loadYaml;
