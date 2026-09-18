const PROFILE_BASE = 'https://www.snapchat.com/add/';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const ENTITY_MAP = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  '#x27': "'",
};

function decodeHtmlEntities(str) {
  return str.replace(/&([a-z0-9#x]+);/gi, (match, code) => ENTITY_MAP[code.toLowerCase()] ?? match);
}

// Snapchat accepts links like:
//   https://www.snapchat.com/add/username
//   https://snapchat.com/add/username
//   https://www.snapchat.com/@username
// or a bare username.
function parseUsername(input) {
  const trimmed = input.trim();
  const addMatch = trimmed.match(/snapchat\.com\/add\/([^/?#]+)/i);
  if (addMatch) return decodeURIComponent(addMatch[1]);
  const atMatch = trimmed.match(/snapchat\.com\/@([^/?#]+)/i);
  if (atMatch) return decodeURIComponent(atMatch[1]);
  return trimmed.replace(/^@/, '');
}

function extractMetaTags(html) {
  const tags = html.match(/<meta[^>]*>/gi) || [];
  const metas = {};
  for (const tag of tags) {
    const propMatch = tag.match(/(?:property|name)="([^"]+)"/i);
    const contentMatch = tag.match(/content="([^"]*)"/i);
    if (propMatch && contentMatch) {
      metas[propMatch[1]] = decodeHtmlEntities(contentMatch[1]);
    }
  }
  return metas;
}

async function fetchProfile(username) {
  const profileUrl = `${PROFILE_BASE}${encodeURIComponent(username)}`;
  const res = await fetch(profileUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (res.status === 404) {
    throw new Error(`Profile "${username}" not found (404). Check the username or link.`);
  }
  if (!res.ok) {
    throw new Error(`Failed to load profile page (HTTP ${res.status}).`);
  }

  const html = await res.text();
  const metas = extractMetaTags(html);
  const imageUrl = metas['og:image'];

  if (!imageUrl) {
    throw new Error(
      'Could not find a profile picture for this account. The page layout may have changed, or the profile may not expose a public image.'
    );
  }

  return {
    username,
    profileUrl: res.url,
    displayName: metas['og:title'] || username,
    description: metas['description'] || metas['og:description'] || '',
    imageUrl,
  };
}

async function downloadImage(imageUrl) {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Failed to download profile picture (HTTP ${res.status}).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get('content-type') || 'image/jpeg',
  };
}

export { parseUsername, fetchProfile, downloadImage };
