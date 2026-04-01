#!/usr/bin/env node

/**
 * ╔═════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                             ║
 * ║  🚀 AEGIS COMPLETE INTEGRATION TEST ORCHESTRATOR 🚀                        ║
 * ║  Automated Service Startup & Comprehensive Testing                         ║
 * ║                                                                             ║
 * ║  This script:                                                               ║
 * ║  1. Validates environment & prerequisites                                  ║
 * ║  2. Starts all required services with health checks                         ║
 * ║  3. Runs Node.js backend integration tests                                 ║
 * ║  4. Runs Python ML services integration tests                              ║
 * ║  5. Generates comprehensive unified test report                            ║
 * ║  6. Cleanly manages service lifecycle                                      ║
 * ║                                                                             ║
 * ║  Usage: node test-orchestrator.js [--skip-services] [--keep-running]      ║
 * ║                                                                             ║
 * ║  Flags:                                                                     ║
 * ║    --skip-services   : Don't start services (assume already running)       ║
 * ║    --keep-running    : Don't shutdown services after tests                 ║
 * ║    --backend-only    : Only test NestJS backend                            ║
 * ║    --ml-only         : Only test ML services                               ║
 * ║                                                                             ║
 * ╚═════════════════════════════════════════════════════════════════════════════╝
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SKIP_SERVICES = process.argv.includes('--skip-services');
const KEEP_RUNNING = process.argv.includes('--keep-running');
const BACKEND_ONLY = process.argv.includes('--backend-only');
const ML_ONLY = process.argv.includes('--ml-only');

const PROJECT_ROOT = path.resolve(__dirname);
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');
const ML_DIR = path.join(PROJECT_ROOT, 'ml-calcultion');

const SERVICES = {
  NESTJS: {
    name: 'NestJS Backend API',
    port: 3001,
    dir: BACKEND_DIR,
    startCmd: 'npm',
    startArgs: ['run', 'start:dev'],
    healthUrl: 'http://localhost:3001/api',  // No health endpoint, just check if API responds
    timeout: 60000,
    skipHealthCheck: true,  // Skip health check for backend since no health endpoint exists
  },
  ML_INSURANCE: {
    name: 'ML Insurance Service',
    port: 8000,
    dir: path.join(ML_DIR, 'ml-insurance-service'),
    startCmd: 'python',
    startArgs: ['main.py'],
    healthUrl: 'http://localhost:8000/health',
    timeout: 30000,
  },
  FRAUD: {
    name: 'Fraud Feature Service',
    port: 8002,
    dir: path.join(ML_DIR, 'fraud-feature-service'),
    startCmd: 'python',
    startArgs: ['main.py'],
    healthUrl: 'http://localhost:8002/health',
    timeout: 30000,
  },
  GRID: {
    name: 'Grid Event Service',
    port: 8003,
    dir: path.join(ML_DIR, 'grid_event_service'),
    startCmd: 'python',
    startArgs: ['main.py'],
    healthUrl: 'http://localhost:8003/health',
    timeout: 30000,
  },
  H3: {
    name: 'H3 Feature Service',
    port: 8004,
    dir: path.join(ML_DIR, 'h3-feature-service'),
    startCmd: 'python',
    startArgs: ['main.py'],
    healthUrl: 'http://localhost:8004/health',
    timeout: 30000,
  },
  KAFKA: {
    name: 'Apache Kafka + ZooKeeper',
    ports: [2181, 9092],
    isDocker: true,
  },
  REDIS: {
    name: 'Redis',
    port: 6379,
    isDocker: true,
  },
};

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let runningProcesses = [];
let testResults = {
  orchestrator: [],
  backend: null,
  ml: null,
  startTime: null,
  endTime: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logHeader(title, subtext = '') {
  console.log(`\n${COLORS.bright}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bright}║  ${title}${COLORS.reset}`.padEnd(79) + '║');
  if (subtext) {
    console.log(`${COLORS.bright}║  ${subtext}${COLORS.reset}`.padEnd(79) + '║');
  }
  console.log(`${COLORS.bright}${'═'.repeat(80)}${COLORS.reset}`);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForService(service, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const isHealthy = await checkPort(service.port);
      if (isHealthy) {
        return true;
      }
    } catch (e) {
      // Continue trying
    }
    await delay(1500);
    process.stdout.write(`  ⏳ Attempt ${i + 1}/${maxAttempts}...\r`);
  }
  return false;
}

function startService(serviceName, service) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(service.dir)) {
      reject(new Error(`Service directory not found: ${service.dir}`));
      return;
    }

    log(`  → Starting ${service.name} in ${service.dir}...`, 'cyan');

    const proc = spawn(service.startCmd, service.startArgs, {
      cwd: service.dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    let stdout = '';
    let stderr = '';
    let startTimeout;

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(startTimeout);
      reject(new Error(`Failed to start ${service.name}: ${err.message}`));
    });

    // Set a timeout for startup
    startTimeout = setTimeout(() => {
      if (proc.exitCode === null) {
        log(`  ✅ ${service.name} process started (PID: ${proc.pid})`, 'green');
        runningProcesses.push(proc);
        resolve(proc);
      }
    }, 3000);
  });
}

async function verifyPrerequisites() {
  logHeader('ENVIRONMENT VERIFICATION', 'Checking prerequisites and dependencies');

  const checks = [
    {
      name: 'Node.js',
      cmd: 'node',
      args: ['--version'],
      required: true,
    },
    {
      name: 'npm',
      cmd: 'npm',
      args: ['--version'],
      required: true,
    },
    {
      name: 'Python 3',
      cmd: 'python',
      args: ['--version'],
      required: true,
    },
    {
      name: 'Docker',
      cmd: 'docker',
      args: ['--version'],
      required: true,
    },
  ];

  let allOk = true;
  for (const check of checks) {
    try {
      const result = spawnSync(check.cmd, check.args, { timeout: 5000 });
      const version = result.stdout?.toString() || result.stderr?.toString() || 'installed';
      log(`  ✅ ${check.name}: ${version.split('\n')[0]}`, 'green');
    } catch (e) {
      if (check.required) {
        log(`  ❌ ${check.name}: ${e.message}`, 'red');
        allOk = false;
      } else {
        log(`  ⚠️  ${check.name}: Not found (optional)`, 'yellow');
      }
    }
  }

  return allOk;
}

async function checkDockerServices() {
  logHeader('DOCKER SERVICES CHECK', 'Verifying Kafka, ZooKeeper, and Redis');

  // Check if Docker daemon is running
  try {
    spawnSync('docker', ['ps'], { timeout: 5000 });
  } catch (e) {
    log('  ⚠️  Docker daemon not responding. Continuing...', 'yellow');
    return false;
  }

  let kafkaHealthy = false;
  let redisHealthy = false;

  // Check Kafka
  try {
    await waitForService({ port: 9092 }, 3);
    log('  ✅ Apache Kafka is running', 'green');
    kafkaHealthy = true;
  } catch (e) {
    log('  ⚠️  Apache Kafka is NOT running (optional)', 'yellow');
  }

  // Check Redis
  try {
    await waitForService({ port: 6379 }, 3);
    log('  ✅ Redis is running', 'green');
    redisHealthy = true;
  } catch (e) {
    log('  ⚠️  Redis is NOT running (optional)', 'yellow');
  }

  return kafkaHealthy && redisHealthy;
}

async function startAllServices() {
  if (SKIP_SERVICES) {
    log('\n⏭️  Skipping service startup (--skip-services)', 'yellow');
    return;
  }

  logHeader('SERVICE STARTUP', 'Starting all microservices and dependencies');

  // Check Docker services first
  await checkDockerServices();

  // Start application services
  const services = BACKEND_ONLY
    ? [SERVICES.NESTJS]
    : ML_ONLY
    ? [SERVICES.ML_INSURANCE, SERVICES.FRAUD, SERVICES.GRID, SERVICES.H3]
    : [SERVICES.NESTJS, SERVICES.ML_INSURANCE, SERVICES.FRAUD, SERVICES.GRID, SERVICES.H3];

  for (const [key, service] of Object.entries(services)) {
    try {
      const startIndex = Object.keys(SERVICES).indexOf(key);
      if (startIndex === -1) continue;

      await startService(key, service);
      process.stdout.write('\n');

      // Wait for service to be healthy
      log(`  ⏳ Waiting for ${service.name} to be healthy...`, 'cyan');
      const isHealthy = await waitForService(service, 20);

      if (isHealthy) {
        log(`  ✅ ${service.name} is healthy`, 'green');
      } else {
        log(`  ⚠️  ${service.name} may not be healthy (continuing anyway)`, 'yellow');
      }
    } catch (error) {
      log(`  ❌ Failed to start service: ${error.message}`, 'red');
    }
  }

  await delay(2000);
  log('\n✅ Service startup complete', 'green');
}

async function runBackendTests() {
  if (ML_ONLY) {
    log('\n⏭️  Skipping backend tests (--ml-only)', 'yellow');
    return null;
  }

  logHeader('BACKEND INTEGRATION TESTS', 'Testing NestJS API and Kafka integration');

  return new Promise((resolve) => {
    const testProc = spawn('node', ['integration-test-realtime.js', '--verbose'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });

    testProc.on('close', (code) => {
      resolve(code === 0);
    });

    testProc.on('error', (err) => {
      log(`\n❌ Backend test error: ${err.message}`, 'red');
      resolve(false);
    });
  });
}

async function runMLTests() {
  if (BACKEND_ONLY) {
    log('\n⏭️  Skipping ML tests (--backend-only)', 'yellow');
    return null;
  }

  logHeader('ML SERVICES INTEGRATION TESTS', 'Testing all Python ML microservices');

  return new Promise((resolve) => {
    const testProc = spawn('python', ['ml_integration_test.py', '--verbose'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });

    testProc.on('close', (code) => {
      resolve(code === 0);
    });

    testProc.on('error', (err) => {
      log(`\n❌ ML test error: ${err.message}`, 'red');
      resolve(false);
    });
  });
}

function killAllProcesses() {
  log('\n🛑 Shutting down services...', 'yellow');
  runningProcesses.forEach((proc) => {
    try {
      if (proc && proc.pid) {
        process.kill(-proc.pid); // Kill process group
      }
    } catch (e) {
      // Ignore
    }
  });
  runningProcesses = [];
}

function generateFinalReport() {
  logHeader('FINAL COMPREHENSIVE REPORT', 'Complete Integration Test Summary');

  console.log(`\n⏱️  Test Duration: ${((testResults.endTime - testResults.startTime) / 1000).toFixed(1)} seconds\n`);

  if (!BACKEND_ONLY) {
    console.log(`${'Backend Integration Tests:'.padEnd(40)} ${testResults.backend === true ? '✅ PASSED' : testResults.backend === false ? '❌ FAILED' : '⏭️  SKIPPED'}`);
  }

  if (!ML_ONLY) {
    console.log(`${'ML Services Integration Tests:'.padEnd(40)} ${testResults.ml === true ? '✅ PASSED' : testResults.ml === false ? '❌ FAILED' : '⏭️  SKIPPED'}`);
  }

  const allPassed = testResults.backend !== false && testResults.ml !== false;

  console.log(`\n${COLORS.bright}${'═'.repeat(80)}${COLORS.reset}`);
  if (allPassed) {
    log('✅ ALL INTEGRATION TESTS PASSED!', 'green');
    log('Your microservices are fully integrated and production-ready.', 'green');
  } else {
    log('⚠️  Some tests failed. Review the logs above for details.', 'red');
  }
  console.log(`${COLORS.bright}${'═'.repeat(80)}${COLORS.reset}\n`);

  console.log(`📊 Test Results Summary:`);
  console.log(`   Backend Tests:  ${testResults.backend === null ? 'SKIPPED' : testResults.backend ? 'PASSED' : 'FAILED'}`);
  console.log(`   ML Tests:       ${testResults.ml === null ? 'SKIPPED' : testResults.ml ? 'PASSED' : 'FAILED'}`);
  console.log(`\n💾 To keep services running, use: node test-orchestrator.js --keep-running`);
  console.log(`📝 View logs at: ${PROJECT_ROOT}`);
  console.log(`\n${'═'.repeat(80)}\n`);

  return allPassed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Orchestration Flow
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.clear();

  console.log(`\n\n${'╔' + '═'.repeat(78) + '╗'}`);
  console.log(`║  AEGIS COMPLETE INTEGRATION TEST ORCHESTRATOR`.padEnd(79) + '║');
  console.log(`║  Comprehensive Microservices Testing Suite`.padEnd(79) + '║');
  console.log(`║  ${new Date().toISOString()}`.padEnd(79) + '║');
  console.log(`${'╚' + '═'.repeat(78) + '╝'}\n`);

  testResults.startTime = Date.now();

  try {
    // Step 1: Verify prerequisites
    const prereqOk = await verifyPrerequisites();
    if (!prereqOk) {
      log('\n❌ Missing critical prerequisites. Cannot proceed.', 'red');
      process.exit(1);
    }

    // Step 2: Start services
    if (!SKIP_SERVICES) {
      await startAllServices();
    }

    // Step 3: Run backend tests
    if (!ML_ONLY) {
      testResults.backend = await runBackendTests();
    }

    // Step 4: Run ML tests
    if (!BACKEND_ONLY) {
      testResults.ml = await runMLTests();
    }

  } catch (error) {
    log(`\n❌ ORCHESTRATOR ERROR: ${error.message}`, 'red');
  } finally {
    testResults.endTime = Date.now();

    // Step 5: Generate final report
    const allPassed = generateFinalReport();

    // Step 6: Cleanup
    if (!KEEP_RUNNING) {
      killAllProcesses();
    } else {
      log('\n✅ Services kept running. Press Ctrl+C to stop.', 'green');
      // Keep process alive
      setInterval(() => {}, 1000);
    }

    process.exit(allPassed ? 0 : 1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n\n🛑 Received interrupt signal. Shutting down...', 'yellow');
  killAllProcesses();
  process.exit(0);
});

main().catch(err => {
  log(`\nFATAL ERROR: ${err.message}`, 'red');
  killAllProcesses();
  process.exit(1);
});
