const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'ar');

function arGlbFilePath(projectId) {
  return path.join(UPLOAD_DIR, `${String(projectId)}.glb`);
}

module.exports = {
  UPLOAD_DIR,
  arGlbFilePath,
};
