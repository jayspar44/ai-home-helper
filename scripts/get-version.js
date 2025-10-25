#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const rootDir = path.join(__dirname, '..');
const versionJsonPath = path.join(rootDir, 'version.json');

try {
  // Read version.json
  const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));

  // Get latest changelog entry
  const latestVersion = versionData.version;
  const latestChangelog = versionData.changelog[latestVersion];

  // Display version info
  console.log('\n📦 Roscoe - AI Home Helper');
  console.log('━'.repeat(50));
  console.log(`Version:      ${versionData.version}`);
  console.log(`Last Updated: ${versionData.lastUpdated || 'N/A'}`);

  if (latestChangelog) {
    console.log(`\n📝 Latest Changes (${latestChangelog.date || 'N/A'}):`);
    console.log(`   ${latestChangelog.description}`);
  }

  console.log('━'.repeat(50));
  console.log('\n');

} catch (error) {
  console.error('❌ Error reading version:', error.message);
  process.exit(1);
}
