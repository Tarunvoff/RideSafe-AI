#!/usr/bin/env node

/**
 * ╔═════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                             ║
 * ║  ✅ AEGIS INTEGRATION TEST SUITE - SETUP VALIDATION & GUIDE                ║
 * ║                                                                             ║
 * ║  This script validates your environment is ready for integration testing.  ║
 * ║  Run this FIRST before attempting to run any tests.                       ║
 * ║                                                                             ║
 * ║  Usage: node setup-validate.js                                            ║
 * ║                                                                             ║
 * ╚═════════════════════════════════════════════════════════════════════════════╝
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const PROJECT_ROOT = path.resolve(__dirname);
const CHECKS = {
  passed: [],
  failed: [],
  warnings: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

function header() {
  console.clear();
  log('\n╔' + '═'.repeat(78) + '╗');
  log('║  AEGIS INTEGRATION TEST SUITE - ENVIRONMENT SETUP VALIDATION'.padEnd(79) + '║');
  log('║  ' + new Date().toISOString().padEnd(76) + '║');
  log('╚' + '═'.repeat(78) + '╝\n');
}

function checkCommand(name, cmd, args = []) {
  try {
    const result = spawnSync(cmd, args, { timeout: 5000, encoding: 'utf-8' });
    if (result.error) throw result.error;
    return { success: true, output: (result.stdout + result.stderr).split('\n')[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function checkFile(filePath, description) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  const exists = fs.existsSync(fullPath);
  return { exists, path: fullPath, description };
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: 'localhost', port, path: '/', method: 'GET', timeout: 1000 },
      () => resolve(true)
    );
    req.on('error', () => resolve(false));
    req.end();
  });
}

function recordCheck(name, passed, detail = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon}  ${name}`);
  if (detail) console.log(`     ${detail}`);

  if (passed) CHECKS.passed.push(name);
  else CHECKS.failed.push(name);
}

function recordWarning(name, detail) {
  console.log(`  ⚠️  ${name}`);
  if (detail) console.log(`     ${detail}`);
  CHECKS.warnings.push(name);
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Checks
// ─────────────────────────────────────────────────────────────────────────────

async function runChecks() {
  // Check 1: Node.js
  console.log(`\n${COLORS.bright}${COLORS.blue}🔍 Checking System Requirements${COLORS.reset}\n`);

  const nodeCheck = checkCommand('node', 'node', ['--version']);
  if (nodeCheck.success) {
    const version = nodeCheck.output.replace(/v/, '').split('.')[0];
    if (parseInt(version) >= 16) {
      recordCheck('Node.js', true, nodeCheck.output);
    } else {
      recordCheck('Node.js', false, `${nodeCheck.output} (require 16+)`);
    }
  } else {
    recordCheck('Node.js', false, 'Not installed');
  }

  // Check 2: npm
  const npmCheck = checkCommand('npm', 'npm', ['--version']);
  recordCheck('npm', npmCheck.success, npmCheck.output || npmCheck.error);

  // Check 3: Python
  const pythonCheck = checkCommand('python', 'python', ['--version']);
  if (pythonCheck.success) {
    const version = pythonCheck.output.match(/\d+\.\d+/)?.[0];
    if (version && parseFloat(version) >= 3.9) {
      recordCheck('Python 3', true, pythonCheck.output);
    } else {
      recordCheck('Python 3', false, `${pythonCheck.output} (require 3.9+)`);
    }
  } else {
    recordCheck('Python 3', false, 'Not installed');
  }

  // Check 4: Docker
  const dockerCheck = checkCommand('docker', 'docker', ['--version']);
  recordCheck('Docker', dockerCheck.success, dockerCheck.output || 'Install from docker.com');

  // Check 5: Docker Compose
  const composeCheck = checkCommand('docker-compose', 'docker-compose', ['--version']);
  recordCheck('Docker Compose', composeCheck.success, composeCheck.output || 'Run: docker-compose');

  // Check 6: Project Files
  console.log(`\n${COLORS.bright}${COLORS.blue}📁 Checking Project Files${COLORS.reset}\n`);

  const requiredFiles = [
    { path: 'backend/package.json', desc: 'Backend dependencies' },
    { path: 'backend/src/app.module.ts', desc: 'NestJS main module' },
    { path: 'ml-calcultion/ml-insurance-service/main.py', desc: 'ML Insurance service' },
    { path: 'ml-calcultion/fraud-feature-service/main.py', desc: 'Fraud service' },
    { path: 'ml-calcultion/h3-feature-service/main.py', desc: 'H3 service' },
    { path: 'ml-calcultion/grid_event_service/main.py', desc: 'Grid service' },
    { path: 'docker-compose.yml', desc: 'Docker services config' },
    { path: 'integration-test-realtime.js', desc: 'Backend tests' },
    { path: 'ml_integration_test.py', desc: 'ML tests' },
    { path: 'test-orchestrator.js', desc: 'Test orchestrator' },
  ];

  requiredFiles.forEach(({ path: filePath, desc }) => {
    const file = checkFile(filePath, desc);
    recordCheck(desc, file.exists, file.exists ? '✓' : `Missing: ${filePath}`);
  });

  // Check 7: Backend Dependencies
  console.log(`\n${COLORS.bright}${COLORS.blue}📦 Checking Dependencies${COLORS.reset}\n`);

  const backendPackageJson = path.join(PROJECT_ROOT, 'backend/package.json');
  if (fs.existsSync(backendPackageJson)) {
    const backendNodeModules = path.join(PROJECT_ROOT, 'backend/node_modules');
    if (fs.existsSync(backendNodeModules)) {
      recordCheck('Backend node_modules', true, 'npm install already run');
    } else {
      recordWarning('Backend node_modules', 'Run: cd backend && npm install');
    }
  }

  const mlReq = path.join(PROJECT_ROOT, 'ml-calcultion/requirements.txt');
  if (fs.existsSync(mlReq)) {
    recordWarning('Python venv', 'Verify: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt');
  }

  // Check 8: Environment & Configuration
  console.log(`\n${COLORS.bright}${COLORS.blue}⚙️  Checking Configuration${COLORS.reset}\n`);

  const envFiles = [
    { path: '.env', optional: true },
    { path: 'backend/.env', optional: true },
    { path: 'ml-calcultion/.env', optional: true },
  ];

  let hasEnv = false;
  envFiles.forEach(({ path: envPath, optional }) => {
    const fullPath = path.join(PROJECT_ROOT, envPath);
    if (fs.existsSync(fullPath)) {
      recordCheck(`${envPath}`, true, 'File exists');
      hasEnv = true;
    } else if (!optional) {
      recordCheck(`${envPath}`, false, 'Missing required config');
    }
  });

  if (!hasEnv) {
    recordWarning('.env files', 'Optional - will use defaults if not present');
  }

  // Check 9: Docker Services (if running)
  console.log(`\n${COLORS.bright}${COLORS.blue}🐳 Checking Docker Services${COLORS.reset}\n`);

  try {
    execSync('docker ps', { encoding: 'utf-8', stdio: 'pipe' });
    recordCheck('Docker daemon', true, 'Running');

    // Check if docker-compose services are up
    const dockerPs = checkCommand('docker', 'docker', ['ps', '--format', '{{.Names}}']);
    if (dockerPs.success) {
      const services = dockerPs.output.split('\n');
      const hasKafka = services.some(s => s.includes('kafka'));
      const hasRedis = services.some(s => s.includes('redis'));
      const hasPostgres = services.some(s => s.includes('postgres'));

      if (hasKafka) recordCheck('Kafka (Docker)', true, 'Running');
      else recordWarning('Kafka (Docker)', 'Run: docker-compose up -d kafka');

      if (hasRedis) recordCheck('Redis (Docker)', true, 'Running');
      else recordWarning('Redis (Docker)', 'Run: docker-compose up -d redis');

      if (hasPostgres) recordCheck('PostgreSQL (Docker)', true, 'Running');
      else recordWarning('PostgreSQL (Docker)', 'Run: docker-compose up -d timescaledb');
    }
  } catch (e) {
    recordWarning('Docker daemon', 'Not running - start Docker Desktop and run: docker-compose up -d');
  }

  // Check 10: Port Availability
  console.log(`\n${COLORS.bright}${COLORS.blue}🔌 Checking Port Availability${COLORS.reset}\n`);

  const ports = [
    { port: 3001, service: 'NestJS API' },
    { port: 8000, service: 'ML Insurance' },
    { port: 8002, service: 'Fraud Service' },
    { port: 8003, service: 'Grid Service' },
    { port: 8004, service: 'H3 Service' },
    { port: 9092, service: 'Kafka' },
    { port: 6379, service: 'Redis' },
  ];

  for (const { port, service } of ports) {
    const available = !(await checkPort(port));
    if (available) {
      recordCheck(`${service} (${port})`, true, 'Port available');
    } else {
      recordWarning(`${service} (${port})`, 'Port in use (service might already be running)');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Summary & Recommendations
// ─────────────────────────────────────────────────────────────────────────────

function generateSummary() {
  console.log(`\n\n${COLORS.bright}${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}║  VALIDATION SUMMARY${COLORS.reset}`.padEnd(80, ' '));
  console.log(`${COLORS.bright}${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}`);

  console.log(`\n✅ Passed: ${CHECKS.passed.length} checks`);
  console.log(`❌ Failed: ${CHECKS.failed.length} checks`);
  console.log(`⚠️  Warnings: ${CHECKS.warnings.length} items\n`);

  if (CHECKS.failed.length === 0) {
    log(`${'═'.repeat(80)}`, 'cyan');
    log('║  ✅ ALL CHECKS PASSED! Ready to run integration tests.'.padEnd(79) + '║', 'green');
    log(`${'═'.repeat(80)}`, 'cyan');
    generateQuickStartGuide();
  } else {
    log(`\n❌ Some required checks failed:`, 'red');
    CHECKS.failed.forEach(check => {
      console.log(`   • ${check}`);
    });

    console.log(`\n${COLORS.bright}Please fix the above issues before running tests.${COLORS.reset}\n`);
    generateSetupInstructions();
  }

  if (CHECKS.warnings.length > 0) {
    console.log(`\n${COLORS.yellow}⚠️  Warnings:${COLORS.reset}`);
    CHECKS.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }
}

function generateQuickStartGuide() {
  console.log(`\n${COLORS.bright}${COLORS.cyan}🚀 QUICK START GUIDE${COLORS.reset}\n`);

  console.log(`${COLORS.bright}Step 1: Start Docker Services${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}docker-compose up -d${COLORS.reset}\n`);

  console.log(`${COLORS.bright}Step 2: Run Full Integration Tests${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}node test-orchestrator.js${COLORS.reset}\n`);

  console.log(`${COLORS.bright}Or: Run Tests Individually${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}node integration-test-realtime.js --verbose${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}python ml_integration_test.py --verbose${COLORS.reset}\n`);

  console.log(`${COLORS.bright}Or: Use Quick Reference Tool${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}node test-quick-reference.js${COLORS.reset}\n`);

  console.log(`${COLORS.bright}Documentation${COLORS.reset}`);
  console.log(`  📖 Complete Guide: ${COLORS.cyan}INTEGRATION_TESTING_GUIDE.md${COLORS.reset}`);
  console.log(`  📄 Test Suite Info: ${COLORS.cyan}TEST_SUITE_README.md${COLORS.reset}\n`);

  console.log(`${COLORS.bright}Expected Test Results${COLORS.reset}`);
  console.log(`  • 145+ backend test cases`);
  console.log(`  • 95+ ML service test cases`);
  console.log(`  • 240+ total test cases`);
  console.log(`  • ~5-10 minutes execution time`);
  console.log(`  • All phases should show ✅ PASS\n`);
}

function generateSetupInstructions() {
  console.log(`${COLORS.bright}${COLORS.cyan}🔧 SETUP INSTRUCTIONS${COLORS.reset}\n`);

  console.log(`${COLORS.bright}1. Install System Requirements${COLORS.reset}`);
  console.log(`   Download and install:`);
  console.log(`   • Node.js 16+: https://nodejs.org`);
  console.log(`   • Python 3.9+: https://python.org`);
  console.log(`   • Docker: https://docker.com`);
  console.log(`   • Docker Compose: ${COLORS.cyan}(included with Docker Desktop)${COLORS.reset}\n`);

  console.log(`${COLORS.bright}2. Install Backend Dependencies${COLORS.reset}`);
  console.log(`   ${COLORS.cyan}cd backend && npm install${COLORS.reset}\n`);

  console.log(`${COLORS.bright}3. Install ML Dependencies${COLORS.reset}`);
  console.log(`   ${COLORS.cyan}cd ml-calcultion && pip install -r requirements.txt${COLORS.reset}\n`);

  console.log(`${COLORS.bright}4. Start Docker Services${COLORS.reset}`);
  console.log(`   ${COLORS.cyan}docker-compose up -d${COLORS.reset}`);
  console.log(`   ${COLORS.yellow}(Wait 30-60 seconds for services to start)${COLORS.reset}\n`);

  console.log(`${COLORS.bright}5. Verify Setup${COLORS.reset}`);
  console.log(`   ${COLORS.cyan}node setup-validate.js${COLORS.reset}
   ${COLORS.yellow}(Run this again after setup)${COLORS.reset}\n`);

  console.log(`${COLORS.bright}6. Run Integration Tests${COLORS.reset}`);
  console.log(`   ${COLORS.cyan}node test-orchestrator.js${COLORS.reset}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  try {
    header();
    await runChecks();
    generateSummary();
    process.exit(CHECKS.failed.length === 0 ? 0 : 1);
  } catch (error) {
    log(`\n❌ Validation failed: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

main();
