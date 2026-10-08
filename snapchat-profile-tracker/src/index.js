#!/usr/bin/env node
import { fetchProfile, downloadImage, parseUsername } from './scraper.js';
import { recordSnapshot, listHistory } from './store.js';

function printUsage() {
  console.log(`Snapchat profile tracker

Usage:
  node src/index.js track <snapchat-profile-link-or-username>
  node src/index.js list [username]

Examples:
  node src/index.js track https://www.snapchat.com/add/yourusername
  node src/index.js track yourusername
  node src/index.js list yourusername
`);
}

async function track(input) {
  const username = parseUsername(input);
  console.log(`Fetching profile: ${username} ...`);
  const profile = await fetchProfile(username);
  console.log(`Found: ${profile.displayName} (${profile.profileUrl})`);

  const { buffer, contentType } = await downloadImage(profile.imageUrl);
  const entry = await recordSnapshot({
    username: profile.username,
    profileUrl: profile.profileUrl,
    displayName: profile.displayName,
    description: profile.description,
    imageBuffer: buffer,
    contentType,
  });

  if (entry.changed) {
    console.log(`Saved new profile picture -> data/${entry.imagePath}`);
  } else {
    console.log(`Profile picture unchanged since last check (data/${entry.imagePath}).`);
  }
  console.log(`History entry recorded at ${entry.timestamp}`);
}

async function list(username) {
  const entries = await listHistory(username);
  if (entries.length === 0) {
    console.log('No history yet.');
    return;
  }
  for (const entry of entries) {
    const flag = entry.changed ? '[CHANGED]' : '[same]   ';
    console.log(`${entry.timestamp}  ${entry.username.padEnd(20)}  ${flag}  data/${entry.imagePath}`);
  }
}

const [, , command, arg] = process.argv;

try {
  if (command === 'track' && arg) {
    await track(arg);
  } else if (command === 'list') {
    await list(arg);
  } else {
    printUsage();
    process.exit(command ? 1 : 0);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
