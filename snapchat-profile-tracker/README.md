# Snapchat Profile Tracker

A small personal Node.js tool: give it your Snapchat profile link, it fetches
your current public profile picture and keeps a local history of every check
(timestamp, profile link, and a copy of the picture).

It works by requesting your public profile page
(`https://www.snapchat.com/add/<username>`), which Snapchat itself uses to
render link previews, and reading the profile picture URL embedded there
(`og:image`). Snapchat has no official public API for this, so this relies on
that page's current structure and may break if Snapchat changes it.

Only use this on your own account, or an account whose owner has agreed to
be tracked — running it against someone else's profile without their
knowledge is not what it's built for.

## Usage

```bash
cd snapchat-profile-tracker

# Record a snapshot (fetch + save picture + log entry)
node src/index.js track https://www.snapchat.com/add/yourusername
# or just the username:
node src/index.js track yourusername

# List recorded history
node src/index.js list yourusername
# or list everything tracked:
node src/index.js list
```

Run `track` again anytime (e.g. periodically via cron) to add a new
snapshot. If the picture hasn't changed since the last check, the tool
reuses the existing image file instead of saving a duplicate, but still logs
that the check happened.

## Where data is stored

- `data/history.json` — one entry per check: timestamp, profile URL, display
  name, image path, image hash, and whether the picture changed.
- `data/images/<username>/` — the downloaded profile pictures, one file per
  distinct picture.

`data/` is gitignored since it's personal tracking data, not project source.

## Requirements

Node.js 18+ (uses the built-in `fetch`), no external dependencies.
