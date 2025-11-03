#!/usr/bin/env node

const find = require('find-process').default || require('find-process');

/**
 * Lists all running dev instances of the app
 * Scans ports 3000-3009 for frontend/backend pairs
 */

const FRONTEND_PORTS = [3000, 3002, 3004, 3006, 3008];

async function listInstances() {
  console.log('Scanning for running development instances...\n');

  const instances = [];

  // Check each frontend/backend port pair
  for (const frontendPort of FRONTEND_PORTS) {
    const backendPort = frontendPort + 1;

    try {
      const [frontendProcesses, backendProcesses] = await Promise.all([
        find('port', frontendPort),
        find('port', backendPort)
      ]);

      const hasFrontend = frontendProcesses.length > 0;
      const hasBackend = backendProcesses.length > 0;

      if (hasFrontend || hasBackend) {
        instances.push({
          frontendPort,
          backendPort,
          hasFrontend,
          hasBackend,
          frontendPid: hasFrontend ? frontendProcesses[0].pid : null,
          backendPid: hasBackend ? backendProcesses[0].pid : null
        });
      }
    } catch (error) {
      // Silently skip errors for individual port checks
      continue;
    }
  }

  // Display results
  if (instances.length === 0) {
    console.log('No running instances found.');
    console.log('\nStart a new instance with:');
    console.log('  npm run dev:local');
    console.log('  npm run dev:local -- 3002');
    return;
  }

  console.log('Found running instances:\n');

  instances.forEach((instance, index) => {
    const { frontendPort, backendPort, hasFrontend, hasBackend, frontendPid, backendPid } = instance;

    console.log(`Instance ${index + 1}:`);
    console.log(`  Frontend: ${frontendPort} ${hasFrontend ? `(PID: ${frontendPid})` : '(not running)'}`);
    console.log(`  Backend:  ${backendPort} ${hasBackend ? `(PID: ${backendPid})` : '(not running)'}`);

    if (hasFrontend && hasBackend) {
      console.log(`  Status:   ✓ Running`);
    } else {
      console.log(`  Status:   ⚠ Partial (one process missing)`);
    }

    console.log();
  });

  console.log(`Total: ${instances.length} instance${instances.length > 1 ? 's' : ''} found`);
  console.log('\nKill an instance with:');
  console.log(`  npm run dev:local:kill -- ${instances[0].frontendPort}`);
}

listInstances().catch(error => {
  console.error('Error listing instances:', error.message);
  process.exit(1);
});
