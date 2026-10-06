#!/usr/bin/env node
/**
 * downloadCardImages.js
 *
 * Downloads every tarot card image referenced in data/majorArcana.js and
 * data/minorArcana.js from Wikimedia Commons, saving them locally to
 * public/images/ so the frontend can serve them directly instead of
 * hotlinking Commons on every page load.
 *
 * Images are fetched through Commons' stable Special:FilePath redirect
 * (the same endpoint your data files' comments say the frontend already
 * relies on), so the exact filenames stored in majorArcana.js/minorArcana.js
 * work as-is — no need to look up File: page URLs by hand.
 *
 * Usage (run from anywhere, paths are resolved relative to this script):
 *   node downloadCardImages.js              # download everything not already present
 *   node downloadCardImages.js --force      # re-download even if a file already exists
 *   node downloadCardImages.js --retry-only # only retry files listed in failed-downloads.json from a previous run
 *
 * Requires Node 18+ (uses global fetch). You're on Node 22, so you're fine.
 */

const fs = require("fs");
const path = require("path");

// ---- config -----------------------------------------------------------

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_DIR = path.join(__dirname, "..", "public", "images");
const DELAY_MS = 5000; // 5 seconds between downloads, as requested
const FAILED_LOG = path.join(__dirname, "failed-downloads.json");

// Wikimedia asks bots/scripts to send a descriptive User-Agent with contact
// info (https://meta.wikimedia.org/wiki/User-Agent_policy). Doing this
// avoids getting silently rate-limited or blocked. Edit the contact email
// below to something real before running this on the VPS.
const USER_AGENT = "MyTarotSiteImageFetcher/1.0 (contact: publiosantospublio@gmail.com)";

const MAX_RETRIES_PER_FILE = 2;

// ---- helpers ------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function commonsFilePathUrl(filename) {
  // Special:FilePath redirects straight to the current full-resolution file
  // for a given Commons filename, without needing the page's hashed path.
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}

async function downloadOne(filename, destPath) {
  const url = commonsFilePathUrl(filename);
  let lastErr;

  for (let attempt = 1; attempt <= MAX_RETRIES_PER_FILE; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) {
        throw new Error("downloaded 0 bytes");
      }

      fs.writeFileSync(destPath, buffer);
      return { ok: true, bytes: buffer.length };
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES_PER_FILE) {
        console.log(`    retry ${attempt}/${MAX_RETRIES_PER_FILE - 1} after error: ${err.message}`);
        await sleep(2000);
      }
    }
  }

  return { ok: false, error: lastErr ? lastErr.message : "unknown error" };
}

// ---- gather the list of images to fetch ---------------------------------

function collectImageFilenames() {
  const majorArcana = require(path.join(DATA_DIR, "majorArcana.js"));
  const { minorArcana } = require(path.join(DATA_DIR, "minorArcana.js"));

  const all = [...majorArcana, ...minorArcana].map((card) => card.image);

  // de-dupe, just in case
  return [...new Set(all)];
}

// ---- main ----------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const retryOnly = args.includes("--retry-only");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let filenames;
  if (retryOnly) {
    if (!fs.existsSync(FAILED_LOG)) {
      console.log(`No ${path.basename(FAILED_LOG)} found — nothing to retry. Run without --retry-only first.`);
      return;
    }
    filenames = JSON.parse(fs.readFileSync(FAILED_LOG, "utf8"));
    console.log(`Retrying ${filenames.length} previously failed file(s).\n`);
  } else {
    filenames = collectImageFilenames();
    console.log(`Found ${filenames.length} unique image filenames across majorArcana.js + minorArcana.js.\n`);
  }

  const failed = [];
  let downloaded = 0;
  let skipped = 0;

  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i];
    const destPath = path.join(OUTPUT_DIR, filename);
    const progress = `[${i + 1}/${filenames.length}]`;

    if (!force && fs.existsSync(destPath)) {
      console.log(`${progress} skip (already exists): ${filename}`);
      skipped++;
      continue;
    }

    process.stdout.write(`${progress} downloading ${filename} ... `);
    const result = await downloadOne(filename, destPath);

    if (result.ok) {
      console.log(`ok (${(result.bytes / 1024).toFixed(1)} KB)`);
      downloaded++;
    } else {
      console.log(`FAILED (${result.error})`);
      failed.push(filename);
    }

    // Wait 5s between downloads — but no need to wait after the very last one.
    if (i < filenames.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\n--- summary ---");
  console.log(`downloaded: ${downloaded}`);
  console.log(`skipped (already present): ${skipped}`);
  console.log(`failed: ${failed.length}`);

  if (failed.length > 0) {
    fs.writeFileSync(FAILED_LOG, JSON.stringify(failed, null, 2));
    console.log(`\nFailed filenames written to ${FAILED_LOG}.`);
    console.log(`Re-run with --retry-only once you're ready to try them again.`);
  } else if (fs.existsSync(FAILED_LOG)) {
    fs.unlinkSync(FAILED_LOG);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
