import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

async function ensureDirs() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}

async function loadHistory() {
  try {
    const raw = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function saveHistory(history) {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function extensionFor(contentType) {
  if (contentType && contentType.includes('png')) return 'png';
  if (contentType && contentType.includes('webp')) return 'webp';
  return 'jpg';
}

// Appends a history entry. Reuses the previous image file when the picture
// hasn't changed, so repeated checks don't pile up duplicate images.
async function recordSnapshot({ username, profileUrl, displayName, description, imageBuffer, contentType }) {
  await ensureDirs();
  const history = await loadHistory();
  const userEntries = history.filter((e) => e.username === username);
  const lastEntry = userEntries[userEntries.length - 1];
  const hash = hashBuffer(imageBuffer);
  const timestamp = new Date().toISOString();

  let imagePath;
  let changed = true;

  if (lastEntry && lastEntry.imageHash === hash) {
    changed = false;
    imagePath = lastEntry.imagePath;
  } else {
    const userDir = path.join(IMAGES_DIR, username);
    await fs.mkdir(userDir, { recursive: true });
    const fileName = `${timestamp.replace(/[:.]/g, '-')}.${extensionFor(contentType)}`;
    const fullPath = path.join(userDir, fileName);
    await fs.writeFile(fullPath, imageBuffer);
    imagePath = path.relative(DATA_DIR, fullPath);
  }

  const entry = {
    timestamp,
    username,
    profileUrl,
    displayName,
    description,
    imagePath,
    imageHash: hash,
    changed,
  };

  history.push(entry);
  await saveHistory(history);
  return entry;
}

async function listHistory(username) {
  const history = await loadHistory();
  return username ? history.filter((e) => e.username === username) : history;
}

export { recordSnapshot, listHistory, DATA_DIR, IMAGES_DIR, HISTORY_FILE };
