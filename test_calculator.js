// Unit tests for CivicQueue Queuing Engine & M/M/c Calculator (Node.js)
// Run with: node test_calculator.js

import assert from 'node:assert';
import {
  calculateEWMA,
  calculateAggregateWaitSec,
  calculateErlangC,
  DEFAULT_ALPHA,
  DEFAULT_SERVICE_DURATION_SEC,
} from './src/services/calculator.ts';

console.log('🧪 Starting CivicQueue Queuing Calculator Unit Tests...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// ---------------------------------------------------------
// 1. EWMA Throughput Tests
// ---------------------------------------------------------
console.log('--- 1. Exponentially Weighted Moving Average (EWMA) ---');

test('EWMA with standard alpha=0.25 correctly weights recent transaction', () => {
  // Baseline: counter taking 120s per customer -> mu = 1/120 = ~0.00833
  const initialMu = 1 / 120;
  // Recent customer completes fast in 60s -> mu_recent = 1/60 = ~0.01667
  const recentDuration = 60;
  const alpha = 0.25;

  const expectedMu = alpha * (1 / recentDuration) + (1 - alpha) * initialMu;
  const actualMu = calculateEWMA(initialMu, recentDuration, alpha);

  assert(
    Math.abs(actualMu - expectedMu) < 1e-6,
    `Expected ${expectedMu}, got ${actualMu}`
  );
  // Service duration should decrease because counter became faster
  assert(1 / actualMu < 120, 'Average service duration should drop after faster service');
});

test('EWMA with slower customer increases average duration', () => {
  const initialMu = 1 / 90;
  const recentDuration = 180; // took 3 minutes
  const actualMu = calculateEWMA(initialMu, recentDuration, 0.25);

  const expectedMu = 0.25 * (1 / 180) + 0.75 * (1 / 90);
  assert(Math.abs(actualMu - expectedMu) < 1e-6);
  assert(1 / actualMu > 90, 'Average service duration should increase after slow service');
});

test('EWMA clamps duration to safe minimum to avoid division by zero anomalies', () => {
  const initialMu = 1 / 100;
  const actualMu = calculateEWMA(initialMu, 0); // zero or negative
  assert.strictEqual(actualMu, initialMu, 'Zero duration should return current mu');
});

// ---------------------------------------------------------
// 2. Dynamic Aggregate Wait Time (M/M/c) Tests
// ---------------------------------------------------------
console.log('\n--- 2. Dynamic Aggregate Wait Time Calculation ---');

test('Estimated wait equals p / sum(mu_i) across active counters', () => {
  // 2 active counters, each processing 1 customer every 120 seconds
  // mu1 = 1/120, mu2 = 1/120 -> sum(mu) = 2/120 = 1/60 customers/sec (1 customer/minute)
  const activeMus = [1 / 120, 1 / 120];
  const position = 3; // 3 people ahead

  // Expected wait = 3 / (1/60) = 180 seconds (3 minutes)
  const res = calculateAggregateWaitSec(position, activeMus);
  assert.strictEqual(res.estWaitSec, 180);
  assert.strictEqual(res.activeCounters, 2);
  assert.strictEqual(res.isCountersPaused, false);
});

test('Position 1 (next in line) with 3 fast counters (each 60s) takes ~20 seconds', () => {
  // 3 counters each 1/60 -> sum = 3/60 = 1/20 per second
  const activeMus = [1 / 60, 1 / 60, 1 / 60];
  const res = calculateAggregateWaitSec(1, activeMus);
  assert.strictEqual(res.estWaitSec, 20);
});

test('Handles all counters closed gracefully with paused flag and baseline fallback', () => {
  const activeMus = []; // 0 counters open
  const position = 4;
  const res = calculateAggregateWaitSec(position, activeMus, 120);

  assert.strictEqual(res.isCountersPaused, true);
  assert.strictEqual(res.activeCounters, 0);
  assert.strictEqual(res.estWaitSec, 4 * 120); // 480 seconds fallback
});

test('Position 0 returns zero wait time', () => {
  const activeMus = [1 / 90];
  const res = calculateAggregateWaitSec(0, activeMus);
  assert.strictEqual(res.estWaitSec, 0);
});

// ---------------------------------------------------------
// 3. Erlang-C Queue Theory Formulas Tests
// ---------------------------------------------------------
console.log('\n--- 3. Erlang-C Probability & Theoretical Queue Formulas ---');

test('Erlang-C correctly computes wait probability and theoretical wait', () => {
  const c = 2; // 2 servers
  const lambda = 0.01; // 1 customer every 100 seconds
  const mu = 0.01; // Each server can serve 1 customer every 100 seconds (total capacity = 0.02)
  // Utilization rho = lambda / (c * mu) = 0.01 / (2 * 0.01) = 0.5 (50% loaded)

  const res = calculateErlangC(c, lambda, mu);
  assert(res.utilization === 0.5, `Utilization should be 0.5, got ${res.utilization}`);
  assert(res.erlangCProbability > 0 && res.erlangCProbability < 1, 'P_W must be in (0,1)');
  assert(res.theoreticalWaitSec > 0, 'Theoretical wait time should be positive');
});

test('Erlang-C saturates when utilization rho >= 1', () => {
  const c = 1;
  const lambda = 0.05;
  const mu = 0.01; // Overloaded!
  const res = calculateErlangC(c, lambda, mu);
  assert.strictEqual(res.erlangCProbability, 1.0);
  assert(res.utilization >= 1.0);
});

console.log(`\n========================================`);
console.log(`Test Results: ${passedTests}/${totalTests} Passed`);
if (passedTests === totalTests) {
  console.log('🎉 All Calculator Unit Tests Passed Successfully!\n');
  process.exit(0);
} else {
  console.error('💥 Some tests failed.\n');
  process.exit(1);
}
