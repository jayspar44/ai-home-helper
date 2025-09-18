#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION_FILE = path.join(__dirname, '../version.json');
const PACKAGE_JSON = path.join(__dirname, '../package.json');
const FRONTEND_PACKAGE_JSON = path.join(__dirname, '../frontend/package.json');

/**
 * Version bump types based on change analysis
 */
const BUMP_TYPES = {
  PATCH: 'patch',    // 1.0.0 -> 1.0.1 (bug fixes, small improvements)
  MINOR: 'minor',    // 1.0.0 -> 1.1.0 (new features, enhancements)
  MAJOR: 'major'     // 1.0.0 -> 2.0.0 (breaking changes, major overhauls)
};

/**
 * Patterns that indicate different types of changes with contextual scoring
 */
const CHANGE_PATTERNS = {
  MAJOR: {
    // Definitive major changes (high weight)
    definitive: [
      'breaking change', 'breaking api', 'api breaking', 'migration required',
      'remove api', 'delete api', 'incompatible', 'major refactor'
    ],
    // Strong indicators (medium-high weight)
    strong: [
      'architecture change', 'database schema', 'auth system', 'core system'
    ]
  },
  MINOR: {
    // Definitive minor changes (high weight)
    definitive: [
      'new feature', 'add feature', 'new functionality', 'feature addition',
      'new endpoint', 'add endpoint', 'new page', 'new component'
    ],
    // Strong indicators (medium-high weight)
    strong: [
      'enhance', 'improvement', 'new capability', 'extend', 'expand'
    ],
    // Weak indicators (low weight, can be overridden)
    weak: [
      'update', 'modify', 'change', 'adjust', 'refactor'
    ]
  },
  PATCH: {
    // Definitive patch changes (high weight)
    definitive: [
      'fix bug', 'bug fix', 'hotfix', 'security fix', 'patch',
      'correct', 'repair', 'resolve issue', 'fix error'
    ],
    // Strong indicators (medium-high weight)
    strong: [
      'fix', 'bug', 'error', 'issue', 'problem', 'broken'
    ],
    // UI/UX specific (usually patch unless major redesign)
    ui_ux: [
      'ui', 'ux', 'style', 'styling', 'css', 'layout', 'design',
      'color', 'theme', 'appearance', 'visual', 'responsive'
    ],
    // Documentation and minor improvements
    minor_improvements: [
      'documentation', 'docs', 'readme', 'comment', 'typo',
      'formatting', 'cleanup', 'refactor small', 'optimize'
    ]
  }
};

/**
 * Reads the current version from version.json
 */
function getCurrentVersion() {
  try {
    const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    return versionData.version;
  } catch (error) {
    console.error('Error reading version file:', error.message);
    return '1.0.0'; // Default version
  }
}

/**
 * Parses a version string into major, minor, patch components
 */
function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

/**
 * Formats version components back to string
 */
function formatVersion(major, minor, patch) {
  return `${major}.${minor}.${patch}`;
}

/**
 * Analyzes change description to determine appropriate version bump using weighted scoring
 */
function analyzeBumpType(changeDescription) {
  const description = changeDescription.toLowerCase();

  // Scoring system: higher scores indicate stronger confidence
  let scores = {
    [BUMP_TYPES.MAJOR]: 0,
    [BUMP_TYPES.MINOR]: 0,
    [BUMP_TYPES.PATCH]: 0
  };

  // MAJOR change scoring
  for (const pattern of CHANGE_PATTERNS.MAJOR.definitive) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.MAJOR] += 100; // Very high confidence
    }
  }
  for (const pattern of CHANGE_PATTERNS.MAJOR.strong) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.MAJOR] += 50;
    }
  }

  // MINOR change scoring
  for (const pattern of CHANGE_PATTERNS.MINOR.definitive) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.MINOR] += 100;
    }
  }
  for (const pattern of CHANGE_PATTERNS.MINOR.strong) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.MINOR] += 50;
    }
  }
  for (const pattern of CHANGE_PATTERNS.MINOR.weak) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.MINOR] += 10; // Low weight, easily overridden
    }
  }

  // PATCH change scoring
  for (const pattern of CHANGE_PATTERNS.PATCH.definitive) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.PATCH] += 100;
    }
  }
  for (const pattern of CHANGE_PATTERNS.PATCH.strong) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.PATCH] += 50;
    }
  }
  for (const pattern of CHANGE_PATTERNS.PATCH.ui_ux) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.PATCH] += 30; // UI/UX changes are usually patches
    }
  }
  for (const pattern of CHANGE_PATTERNS.PATCH.minor_improvements) {
    if (description.includes(pattern)) {
      scores[BUMP_TYPES.PATCH] += 25;
    }
  }

  // Special handling for documentation updates - should always be patch
  if (description.includes('claude.md') ||
      description.includes('documentation') ||
      description.includes('readme') ||
      description.includes(' docs ') ||
      description.includes('instructions')) {
    scores[BUMP_TYPES.PATCH] += 60; // High score to override other patterns
  }

  // Special cases for better classification
  if (description.includes('version system') || description.includes('versioning')) {
    scores[BUMP_TYPES.MINOR] += 60; // New feature addition
  }

  // If both layout/UI changes AND new features are present, lean toward minor
  const hasUiChanges = CHANGE_PATTERNS.PATCH.ui_ux.some(pattern => description.includes(pattern));
  const hasNewFeature = CHANGE_PATTERNS.MINOR.definitive.some(pattern => description.includes(pattern)) ||
                       description.includes('create') || description.includes('implement');

  if (hasUiChanges && hasNewFeature) {
    scores[BUMP_TYPES.MINOR] += 20; // Boost minor when both UI and features are present
  }

  // Find the bump type with the highest score
  const maxScore = Math.max(...Object.values(scores));

  // If no patterns matched (all scores are 0), default to patch
  if (maxScore === 0) {
    return BUMP_TYPES.PATCH;
  }

  // Return the bump type with the highest score
  for (const [bumpType, score] of Object.entries(scores)) {
    if (score === maxScore) {
      return bumpType;
    }
  }

  // Fallback
  return BUMP_TYPES.PATCH;
}

/**
 * Bumps version based on type
 */
function bumpVersion(currentVersion, bumpType) {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (bumpType) {
    case BUMP_TYPES.MAJOR:
      return formatVersion(major + 1, 0, 0);
    case BUMP_TYPES.MINOR:
      return formatVersion(major, minor + 1, 0);
    case BUMP_TYPES.PATCH:
    default:
      return formatVersion(major, minor, patch + 1);
  }
}

/**
 * Updates version in all relevant files
 */
function updateVersionFiles(newVersion, changeDescription) {
  try {
    // Update version.json
    const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    versionData.version = newVersion;
    versionData.lastUpdated = new Date().toISOString();

    if (!versionData.changelog) {
      versionData.changelog = {};
    }
    versionData.changelog[newVersion] = {
      description: changeDescription,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));

    // Update root package.json
    if (fs.existsSync(PACKAGE_JSON)) {
      const packageData = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
      packageData.version = newVersion;
      fs.writeFileSync(PACKAGE_JSON, JSON.stringify(packageData, null, 2));
    }

    // Update frontend package.json
    if (fs.existsSync(FRONTEND_PACKAGE_JSON)) {
      const frontendPackageData = JSON.parse(fs.readFileSync(FRONTEND_PACKAGE_JSON, 'utf8'));
      frontendPackageData.version = newVersion;
      fs.writeFileSync(FRONTEND_PACKAGE_JSON, JSON.stringify(frontendPackageData, null, 2));
    }

    console.log(`✅ Version updated to ${newVersion}`);
    console.log(`📝 Change: ${changeDescription}`);

    return true;
  } catch (error) {
    console.error('❌ Error updating version files:', error.message);
    return false;
  }
}

/**
 * Main function to handle version bumping
 */
function handleVersionBump(changeDescription, forceBumpType = null) {
  const currentVersion = getCurrentVersion();
  const bumpType = forceBumpType || analyzeBumpType(changeDescription);
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`🔄 Bumping version from ${currentVersion} to ${newVersion} (${bumpType})`);

  return updateVersionFiles(newVersion, changeDescription);
}

/**
 * CLI interface
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Current version:', getCurrentVersion());
    return;
  }

  const command = args[0];

  switch (command) {
    case 'bump':
      const changeDescription = args[1] || 'Version bump';
      const forceBumpType = args[2]; // Optional: 'patch', 'minor', 'major'
      handleVersionBump(changeDescription, forceBumpType);
      break;

    case 'get':
      console.log(getCurrentVersion());
      break;

    case 'analyze':
      const description = args[1] || '';
      const suggestedBump = analyzeBumpType(description);
      console.log(`Suggested bump type for "${description}": ${suggestedBump}`);
      break;

    default:
      console.log('Usage:');
      console.log('  node version-manager.js                    # Get current version');
      console.log('  node version-manager.js get               # Get current version');
      console.log('  node version-manager.js bump "description" [type] # Bump version');
      console.log('  node version-manager.js analyze "description"     # Analyze change type');
      console.log('');
      console.log('Bump types: patch, minor, major');
  }
}

// Export functions for use by other scripts
module.exports = {
  getCurrentVersion,
  analyzeBumpType,
  handleVersionBump,
  BUMP_TYPES
};

// Run CLI if called directly
if (require.main === module) {
  main();
}