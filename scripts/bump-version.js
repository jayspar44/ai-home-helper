#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: npm run version:bump <version> "<description>"');
  console.error('Example: npm run version:bump 2.13.0 "Add new feature XYZ"');
  process.exit(1);
}

const newVersion = args[0];
const description = args.slice(1).join(' ');

// Validate semantic versioning format
const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(newVersion)) {
  console.error(`Error: Invalid version format "${newVersion}"`);
  console.error('Version must follow semantic versioning (e.g., 2.13.0)');
  process.exit(1);
}

// Paths
const rootDir = path.join(__dirname, '..');
const versionJsonPath = path.join(rootDir, 'version.json');
const packageJsonPaths = [
  path.join(rootDir, 'package.json'),
  path.join(rootDir, 'frontend', 'package.json'),
  path.join(rootDir, 'backend', 'package.json')
];

try {
  // Read version.json
  console.log('📝 Reading version.json...');
  const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
  const oldVersion = versionData.version;

  // Update version and add changelog entry
  versionData.version = newVersion;
  const timestamp = new Date().toISOString();
  versionData.lastUpdated = timestamp;
  const humanDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  versionData.changelog[newVersion] = {
    description: description,
    timestamp: timestamp,
    date: humanDate
  };

  // Write updated version.json
  console.log(`✅ Updating version: ${oldVersion} → ${newVersion}`);
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8');
  console.log(`✅ Added changelog entry: "${description}"`);

  // Update all package.json files
  console.log('\n📦 Syncing to package.json files...');
  let syncCount = 0;

  for (const pkgPath of packageJsonPaths) {
    if (fs.existsSync(pkgPath)) {
      const packageData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      packageData.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(packageData, null, 2) + '\n', 'utf8');

      const relativePath = path.relative(rootDir, pkgPath);
      console.log(`   ✅ ${relativePath}`);
      syncCount++;
    }
  }

  // Summary
  console.log(`\n🎉 Version bump complete!`);
  console.log(`   Version: ${newVersion}`);
  console.log(`   Files updated: ${syncCount + 1} (version.json + ${syncCount} package.json files)`);
  console.log(`   Changelog: ${description}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
