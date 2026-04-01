#!/usr/bin/env node

/**
 * ╔═════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                             ║
 * ║  📋 AEGIS INTEGRATION TEST QUICK REFERENCE & TROUBLESHOOTING               ║
 * ║                                                                             ║
 * ║  Interactive tool for:                                                     ║
 * ║  • Quick service status checks                                             ║
 * ║  • Port availability verification                                          ║
 * ║  • Test run templates                                                      ║
 * ║  • Common troubleshooting steps                                            ║
 * ║                                                                             ║
 * ║  Usage: node test-quick-reference.js [command]                            ║
 * ║                                                                             ║
 * ╚═════════════════════════════════════════════════════════════════════════════╝
 */

const http = require('http');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const SERVICE_PORTS = {
  'NestJS Backend': 3001,
  'ML Insurance': 8000,
  'Fraud Service': 8002,
  'Grid Service': 8003,
  'H3 Service': 8004,
  'Kafka': 9092,
  'Redis': 6379,
  'PostgreSQL': 5433,
  'ZooKeeper': 2181,
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

function logSection(title) {
  console.log(`\n${COLORS.bright}${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}║  ${title}${COLORS.reset}`.padEnd(80, ' ') + `${COLORS.bright}${COLORS.cyan}║${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}${'═'.repeat(80)}${COLORS.reset}`);
}

async function checkPort(port, timeout = 2000) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: port,
        path: '/health',
        method: 'GET',
        timeout: timeout,
      },
      (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function checkAllServices() {
  logSection('SERVICE HEALTH CHECK');

  const results = {};
  for (const [name, port] of Object.entries(SERVICE_PORTS)) {
    const isHealthy = await checkPort(port);
    results[name] = isHealthy;

    const icon = isHealthy ? '✅' : '❌';
    const status = isHealthy ? 'RUNNING' : 'DOWN';
    console.log(`  ${icon}  ${name.padEnd(20)} (Port ${port.toString().padEnd(5)}) : ${status}`);
  }

  const runningCount = Object.values(results).filter(Boolean).length;
  console.log(`\n  📊 ${runningCount}/${Object.keys(results).length} services healthy\n`);

  return results;
}

function showQuickCommands() {
  logSection('QUICK COMMANDS');

  const commands = [
    {
      title: '▶️  RUN FULL TEST SUITE',
      cmd: 'node test-orchestrator.js',
      desc: 'Auto-starts services + runs all tests',
    },
    {
      title: '▶️  RUN BACKEND TESTS ONLY',
      cmd: 'node integration-test-realtime.js --verbose',
      desc: 'Test NestJS API + Kafka integration',
    },
    {
      title: '▶️  RUN ML TESTS ONLY',
      cmd: 'python ml_integration_test.py --verbose',
      desc: 'Test all Python ML microservices',
    },
    {
      title: '▶️  QUICK HEALTH CHECK',
      cmd: 'node test-orchestrator.js --skip-services',
      desc: 'Test services (assume already running)',
    },
    {
      title: '▶️  KEEP SERVICES RUNNING',
      cmd: 'node test-orchestrator.js --keep-running',
      desc: 'Run tests and keep services alive',
    },
  ];

  commands.forEach((cmd, idx) => {
    console.log(`\n${COLORS.bright}${cmd.title}${COLORS.reset}`);
    console.log(`   ${COLORS.cyan}${cmd.cmd}${COLORS.reset}`);
    console.log(`   ${cmd.desc}`);
  });

  console.log('\n');
}

function showStartServiceGuide() {
  logSection('START SERVICES INDIVIDUALLY');

  const services = [
    {
      name: 'Backend (NestJS)',
      cmd: 'cd backend && npm run start:dev',
      port: 3001,
      notes: 'Requires PostgreSQL to be running',
    },
    {
      name: 'ML Insurance Service',
      cmd: 'cd ml-calcultion/ml-insurance-service && python main.py',
      port: 8000,
      notes: 'Requires Python 3.9+',
    },
    {
      name: 'Fraud Feature Service',
      cmd: 'cd ml-calcultion/fraud-feature-service && python main.py',
      port: 8002,
      notes: 'Requires Python 3.9+',
    },
    {
      name: 'Grid Event Service',
      cmd: 'cd ml-calcultion/grid_event_service && python main.py',
      port: 8003,
      notes: 'Requires Kafka to be running',
    },
    {
      name: 'H3 Feature Service',
      cmd: 'cd ml-calcultion/h3-feature-service && python main.py',
      port: 8004,
      notes: 'Requires internet for weather/AQI APIs',
    },
  ];

  services.forEach((svc, idx) => {
    console.log(`\n${idx + 1}. ${COLORS.bright}${svc.name}${COLORS.reset}`);
    console.log(`   Command: ${COLORS.cyan}${svc.cmd}${COLORS.reset}`);
    console.log(`   Port: ${svc.port}`);
    console.log(`   ${COLORS.yellow}${svc.notes}${COLORS.reset}`);
  });

  console.log('\n');
}

function showCommonIssues() {
  logSection('COMMON ISSUES & SOLUTIONS');

  const issues = [
    {
      issue: '❌ "Port already in use" error',
      solutions: [
        'On Windows: Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process',
        'On Mac/Linux: lsof -ti:3001 | xargs kill -9',
        'Or change the port in .env or service config',
      ],
    },
    {
      issue: '❌ "Connection refused" to database',
      causes: [
        'PostgreSQL/TimescaleDB is not running',
        'Database credentials in .env are incorrect',
      ],
      solutions: [
        'Check docker-compose: docker ps',
        'Start containers: docker-compose up -d',
        'Verify .env DATABASE_URL is correct',
      ],
    },
    {
      issue: '❌ "Kafka topic not found" error',
      causes: [
        'Kafka topics haven\'t been created',
        'Zookeeper is not running',
      ],
      solutions: [
        'Wait 10s after docker-compose up -d',
        'Manually create topics if needed',
        'Check docker-compose.yml for correct config',
      ],
    },
    {
      issue: '❌ "Redis connection refused"',
      causes: ['Redis service not running', 'Wrong Redis URL in .env'],
      solutions: [
        'Start Redis: docker-compose up -d redis',
        'Check Redis is accessible: redis-cli ping',
        'Verify REDIS_URL=redis://localhost:6379 in .env',
      ],
    },
    {
      issue: '❌ Tests timeout (> 30s)',
      causes: [
        'Services are slow to respond',
        'Network connectivity issues',
      ],
      solutions: [
        'Check service logs for errors',
        'Ensure services have finished starting',
        'Increase timeout in test files if needed',
        'Run --quick mode to skip performance tests',
      ],
    },
    {
      issue: '❌ Python import errors',
      causes: ['Missing dependencies', 'Wrong Python version'],
      solutions: [
        'Install requirements: pip install -r requirements.txt',
        'Check Python version: python --version (need 3.9+)',
        'Create virtual env: python -m venv venv && source venv/bin/activate',
      ],
    },
    {
      issue: '❌ JWT authentication fails in tests',
      causes: [
        'NestJS not running',
        'Database connection issue',
      ],
      solutions: [
        'Start NestJS: cd backend && npm run start:dev',
        'Check database migrations ran',
        'Verify Prisma is initialized: npx prisma db push',
      ],
    },
  ];

  issues.forEach((item, idx) => {
    console.log(`\n${COLORS.bright}${item.issue}${COLORS.reset}`);
    
    if (item.causes) {
      console.log(`${COLORS.yellow}Possible Causes:${COLORS.reset}`);
      item.causes.forEach(c => console.log(`  • ${c}`));
    }

    console.log(`${COLORS.green}Solutions:${COLORS.reset}`);
    item.solutions.forEach(s => console.log(`  1. ${s}`));
  });

  console.log('\n');
}

function showKafkaDebug() {
  logSection('KAFKA DEBUGGING');

  const commands = [
    {
      task: 'List all Kafka topics',
      cmd: 'docker exec -it <kafka-container> kafka-topics.sh --bootstrap-server localhost:9092 --list',
    },
    {
      task: 'Monitor driver_telemetry topic',
      cmd: 'docker exec -it <kafka-container> kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic driver_telemetry --from-beginning',
    },
    {
      task: 'Check Kafka broker logs',
      cmd: 'docker logs <kafka-container> --tail 50 -f',
    },
    {
      task: 'Create a new topic manually',
      cmd: 'docker exec -it <kafka-container> kafka-topics.sh --bootstrap-server localhost:9092 --create --topic test-topic --partitions 1 --replication-factor 1',
    },
    {
      task: 'Check Zookeeper connection',
      cmd: 'docker exec -it <zookeeper-container> zkCli.sh -server localhost:2181',
    },
  ];

  console.log('Common Kafka debugging commands:\n');
  commands.forEach((item, idx) => {
    console.log(`${idx + 1}. ${COLORS.bright}${item.task}${COLORS.reset}`);
    console.log(`   ${COLORS.cyan}${item.cmd}${COLORS.reset}\n`);
  });
}

function showTestOutput() {
  logSection('UNDERSTANDING TEST OUTPUT');

  console.log(`\n${COLORS.bright}Test Result Icons:${COLORS.reset}`);
  console.log(`  ✅ PASS   - Test completed successfully`);
  console.log(`  ❌ FAIL   - Test failed, check details below`);
  console.log(`  ⏭️  SKIP   - Test was skipped (e.g., service not available)`);
  console.log(`  ⏳ WAIT   - Test is waiting for a condition`);

  console.log(`\n${COLORS.bright}Phase Structure:${COLORS.reset}`);
  console.log(`  Phase 1  - Service Health Checks`);
  console.log(`  Phase 2  - NestJS Authentication`);
  console.log(`  Phase 3  - H3 Geographic Features`);
  console.log(`  Phase 4  - ML Insurance Risk Scoring`);
  console.log(`  Phase 5  - Fraud Detection`);
  console.log(`  Phase 6  - Grid Event Service`);
  console.log(`  Phase 7  - Backend Fraud Analysis`);
  console.log(`  Phase 8  - End-to-End Pipeline`);
  console.log(`  Phase 9  - Performance Testing`);
  console.log(`  Phase 10 - Error Handling`);

  console.log(`\n${COLORS.bright}Reading Examples:${COLORS.reset}`);
  console.log(`\n  ✅ User Registration`);
  console.log(`     → Email: test_driver_1234567890@ridesafe.com`);
  console.log(`\n  ❌ Fraud Analysis Pipeline`);
  console.log(`     → Status 502: Bad Gateway (service may be restarting)`);

  console.log('\n');
}

function showEnvironmentSetup() {
  logSection('ENVIRONMENT SETUP');

  const platform = os.platform();
  const isWindows = platform === 'win32';

  console.log(`${COLORS.bright}Detected OS: ${COLORS.reset}${platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux'}\n`);

  console.log(`${COLORS.bright}Required Components:${COLORS.reset}`);
  console.log(`  • Node.js 16+ (for backend + orchestrator)`);
  console.log(`  • Python 3.9+ (for ML services)`);
  console.log(`  • Docker & Docker Compose (for infrastructure)`);
  console.log(`  • npm & pip (package managers)`);

  console.log(`\n${COLORS.bright}Installation Steps:${COLORS.reset}\n`);

  console.log(`1. Backend Dependencies:`);
  console.log(`   ${COLORS.cyan}cd backend && npm install${COLORS.reset}`);

  console.log(`\n2. ML Dependencies:`);
  console.log(`   ${COLORS.cyan}cd ml-calcultion && pip install -r requirements.txt${COLORS.reset}`);

  console.log(`\n3. Start Infrastructure (Docker):`);
  console.log(`   ${COLORS.cyan}docker-compose up -d${COLORS.reset}`);

  console.log(`\n4. Database Setup:`);
  console.log(`   ${COLORS.cyan}cd backend && npx prisma db push${COLORS.reset}`);

  console.log(`\n5. Start Services & Run Tests:`);
  console.log(`   ${COLORS.cyan}node test-orchestrator.js${COLORS.reset}`);

  console.log('\n');
}

function showPerformanceTips() {
  logSection('PERFORMANCE OPTIMIZATION TIPS');

  const tips = [
    {
      area: 'ML Service Inference',
      tips: [
        'Pre-warm models on startup (batch predict 1 sample)',
        'Use smaller models for real-time endpoints',
        'Cache H3 features for common cells',
        'Batch requests when possible',
      ],
    },
    {
      area: 'Database Queries',
      tips: [
        'Add indexes on frequently queried columns',
        'Use connection pooling (PgBouncer)',
        'Archive old telemetry data regularly',
        'Analyze query plans: EXPLAIN ANALYZE',
      ],
    },
    {
      area: 'Kafka Processing',
      tips: [
        'Increase consumer group partitions',
        'Tune batch.size and linger.ms',
        'Monitor consumer lag regularly',
        'Use async processing where possible',
      ],
    },
    {
      area: 'Redis Caching',
      tips: [
        'Set appropriate TTLs for cached data',
        'Monitor memory usage and eviction',
        'Use Redis Cluster for high availability',
        'Implement cache warming for hot keys',
      ],
    },
    {
      area: 'Frontend/API Layer',
      tips: [
        'Implement request caching (CDN)',
        'Use compression (gzip/brotli)',
        'Connection pooling to services',
        'Circuit breaker pattern for resilience',
      ],
    },
  ];

  tips.forEach(({ area, tips: tipsList }) => {
    console.log(`${COLORS.bright}${area}:${COLORS.reset}`);
    tipsList.forEach(tip => console.log(`  • ${tip}`));
    console.log();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Menu
// ─────────────────────────────────────────────────────────────────────────────

function showMainMenu() {
  logSection('AEGIS INTEGRATION TESTING - QUICK REFERENCE');

  console.log(`\n${COLORS.bright}Select an option:${COLORS.reset}\n`);
  console.log(`  1. Check service health`);
  console.log(`  2. Quick test commands`);
  console.log(`  3. Start services individually`);
  console.log(`  4. Common issues & solutions`);
  console.log(`  5. Kafka debugging guide`);
  console.log(`  6. Understanding test output`);
  console.log(`  7. Environment setup`);
  console.log(`  8. Performance optimization tips`);
  console.log(`  9. Exit`);
  console.log('\n');
}

async function main() {
  console.clear();

  log('\n╔' + '═'.repeat(78) + '╗');
  log('║  AEGIS INTEGRATION TESTING - QUICK REFERENCE & TROUBLESHOOTING'.padEnd(79) + '║');
  log('╚' + '═'.repeat(78) + '╝\n');

  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Interactive mode
    showMainMenu();
    const command = process.argv[2] || '1';

    switch (command) {
      case '1':
        await checkAllServices();
        break;
      case '2':
        showQuickCommands();
        break;
      case '3':
        showStartServiceGuide();
        break;
      case '4':
        showCommonIssues();
        break;
      case '5':
        showKafkaDebug();
        break;
      case '6':
        showTestOutput();
        break;
      case '7':
        showEnvironmentSetup();
        break;
      case '8':
        showPerformanceTips();
        break;
      default:
        console.log('\n👋 Goodbye!\n');
        process.exit(0);
    }
  } else {
    // Command mode
    const cmd = args[0];
    switch (cmd) {
      case 'status':
      case 'health':
        await checkAllServices();
        break;
      case 'commands':
        showQuickCommands();
        break;
      case 'start':
        showStartServiceGuide();
        break;
      case 'issues':
      case 'troubleshoot':
        showCommonIssues();
        break;
      case 'kafka':
        showKafkaDebug();
        break;
      case 'output':
        showTestOutput();
        break;
      case 'setup':
        showEnvironmentSetup();
        break;
      case 'perf':
      case 'performance':
        showPerformanceTips();
        break;
      default:
        log(`\nUnknown command: ${cmd}`, 'red');
        log('\nAvailable commands:', 'cyan');
        log('  status, health - Check service health');
        log('  commands - Show quick test commands');
        log('  start - Service startup guide');
        log('  issues, troubleshoot - Common issues');
        log('  kafka - Kafka debugging');
        log('  output - Understand test output');
        log('  setup - Environment setup');
        log('  perf, performance - Performance tips\n');
    }
  }
}

main().catch(err => {
  log(`\n❌ Error: ${err.message}\n`, 'red');
  process.exit(1);
});
