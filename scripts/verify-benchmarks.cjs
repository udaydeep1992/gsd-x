#!/usr/bin/env node
/**
 * GSD-X Benchmark Verification Script (Node.js)
 * =============================================
 *
 * Validates mathematical rigor, internal consistency, and documentation parity
 * against the canonical benchmark dataset in benchmarks/data/benchmark_results.json.
 *
 * Exits 0 on PASS, 1 on FAIL.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CANONICAL_DATA_PATH = path.join(REPO_ROOT, 'benchmarks', 'data', 'benchmark_results.json');
const README_PATH = path.join(REPO_ROOT, 'README.md');

function fail(msg) {
  console.error(`\n❌ FAIL: ${msg}`);
  process.exit(1);
}

function approxEqual(a, b, tol = 1e-4) {
  return Math.abs(a - b) <= tol;
}

function main() {
  console.log('═'.repeat(60));
  console.log(' GSD-X Comprehensive Benchmark & Mathematical Audit');
  console.log('═'.repeat(60));

  if (!fs.existsSync(CANONICAL_DATA_PATH)) {
    fail(`Canonical benchmark data not found at ${CANONICAL_DATA_PATH}`);
  }

  const data = JSON.parse(fs.readFileSync(CANONICAL_DATA_PATH, 'utf-8'));
  const pricing = data.pricing || {};
  const inPrice = pricing.inputPricePerMillion || 10.0;
  const outPrice = pricing.outputPricePerMillion || 50.0;

  console.log(`\n[1] Verifying Pricing Model: Input $${inPrice.toFixed(2)}/M, Output $${outPrice.toFixed(2)}/M`);

  const scenarios = data.scenarios || [];
  if (scenarios.length !== 8) {
    fail(`Expected 8 scenarios, found ${scenarios.length}`);
  }

  let sumBaseTokens = 0;
  let sumGsxTokens = 0;
  let sumBaseCost = 0.0;
  let sumGsxCost = 0.0;
  let sumBaseIn = 0;
  let sumBaseOut = 0;
  let sumGsxIn = 0;
  let sumGsxOut = 0;

  console.log('\n[2] Verifying Scenario Mathematics:');

  for (const sc of scenarios) {
    const name = sc.name;
    const base = sc.baseline;
    const gsx = sc.gsx;
    const sav = sc.savings;

    if (base.inputTokens + base.outputTokens !== base.totalTokens) {
      fail(`${name}: baseline inputTokens (${base.inputTokens}) + outputTokens (${base.outputTokens}) !== totalTokens (${base.totalTokens})`);
    }

    if (gsx.inputTokens + gsx.outputTokens !== gsx.totalTokens) {
      fail(`${name}: gsx inputTokens (${gsx.inputTokens}) + outputTokens (${gsx.outputTokens}) !== totalTokens (${gsx.totalTokens})`);
    }

    if (base.outputTokens !== gsx.outputTokens) {
      fail(`${name}: baseline output tokens (${base.outputTokens}) !== gsx output tokens (${gsx.outputTokens})`);
    }

    const expectedBaseCost = (base.inputTokens * inPrice + base.outputTokens * outPrice) / 1_000_000;
    const expectedGsxCost = (gsx.inputTokens * inPrice + gsx.outputTokens * outPrice) / 1_000_000;

    if (!approxEqual(base.cost, expectedBaseCost)) {
      fail(`${name}: baseline cost mismatch: ${base.cost} !== ${expectedBaseCost}`);
    }
    if (!approxEqual(gsx.cost, expectedGsxCost)) {
      fail(`${name}: gsx cost mismatch: ${gsx.cost} !== ${expectedGsxCost}`);
    }

    const rawTokenSav = ((base.totalTokens - gsx.totalTokens) / base.totalTokens) * 100;
    const reportedTokenSav = Math.round(rawTokenSav * 10) / 10;
    if (Math.round(sav.tokenPercent * 10) / 10 !== reportedTokenSav) {
      fail(`${name}: token savings % mismatch: reported ${sav.tokenPercent} !== calculated ${reportedTokenSav}`);
    }

    const rawCostSav = ((expectedBaseCost - expectedGsxCost) / expectedBaseCost) * 100;
    const reportedCostSav = Math.round(rawCostSav * 10) / 10;
    if (Math.round(sav.costPercent * 10) / 10 !== reportedCostSav) {
      fail(`${name}: cost savings % mismatch: reported ${sav.costPercent} !== calculated ${reportedCostSav}`);
    }

    sumBaseTokens += base.totalTokens;
    sumGsxTokens += gsx.totalTokens;
    sumBaseCost += expectedBaseCost;
    sumGsxCost += expectedGsxCost;
    sumBaseIn += base.inputTokens;
    sumBaseOut += base.outputTokens;
    sumGsxIn += gsx.inputTokens;
    sumGsxOut += gsx.outputTokens;

    console.log(`  ✓ ${name}: ${base.totalTokens} -> ${gsx.totalTokens} tokens (-${reportedTokenSav.toFixed(1)}%), $${base.cost.toFixed(4)} -> $${gsx.cost.toFixed(4)} (-${reportedCostSav.toFixed(1)}%)`);
  }

  console.log('\n[3] Verifying Aggregate Metrics:');
  if (sumBaseTokens !== 25482) {
    fail(`Aggregate baseline tokens mismatch: ${sumBaseTokens} !== 25482`);
  }
  if (sumGsxTokens !== 8288) {
    fail(`Aggregate GSD-X tokens mismatch: ${sumGsxTokens} !== 8288`);
  }

  const tokensSaved = sumBaseTokens - sumGsxTokens;
  if (tokensSaved !== 17194) {
    fail(`Tokens saved mismatch: ${tokensSaved} !== 17194`);
  }

  const aggTokenSavingsPct = (tokensSaved / sumBaseTokens) * 100;
  if (Math.round(aggTokenSavingsPct * 10) / 10 !== 67.5) {
    fail(`Aggregate token savings % mismatch: ${aggTokenSavingsPct.toFixed(3)}% !== 67.5%`);
  }

  if (!approxEqual(sumBaseCost, 0.52162)) {
    fail(`Aggregate baseline cost mismatch: ${sumBaseCost} !== 0.52162`);
  }
  if (!approxEqual(sumGsxCost, 0.34968)) {
    fail(`Aggregate GSD-X cost mismatch: ${sumGsxCost} !== 0.34968`);
  }

  const aggCostSavingsPct = ((sumBaseCost - sumGsxCost) / sumBaseCost) * 100;
  if (Math.round(aggCostSavingsPct * 10) / 10 !== 33.0) {
    fail(`Aggregate cost savings % mismatch: ${aggCostSavingsPct.toFixed(3)}% !== 33.0%`);
  }

  console.log(`  ✓ Total Baseline Tokens: ${sumBaseTokens.toLocaleString()} (${sumBaseIn.toLocaleString()} in, ${sumBaseOut.toLocaleString()} out)`);
  console.log(`  ✓ Total GSD-X Tokens:    ${sumGsxTokens.toLocaleString()} (${sumGsxIn.toLocaleString()} in, ${sumGsxOut.toLocaleString()} out)`);
  console.log(`  ✓ Net Tokens Eliminated: ${tokensSaved.toLocaleString()} (${aggTokenSavingsPct.toFixed(3)}% -> 67.5%)`);
  console.log(`  ✓ Unrounded Baseline Cost: $${sumBaseCost.toFixed(5)} (displays as $0.5216, sum of rounded scenario displays is $0.5217)`);
  console.log(`  ✓ Unrounded GSD-X Cost:    $${sumGsxCost.toFixed(5)} (displays as $0.3497)`);
  console.log(`  ✓ Net Cost Savings:        $${(sumBaseCost - sumGsxCost).toFixed(5)} (${aggCostSavingsPct.toFixed(3)}% -> 33.0%)`);

  console.log('\n[4] Verifying Scale Projections (1M, 10M, 100M Baseline Tokens):');
  const scale1m = 1_000_000 / sumBaseTokens;
  const base1mIn = sumBaseIn * scale1m;
  const base1mOut = sumBaseOut * scale1m;
  const base1mCost = (base1mIn * inPrice + base1mOut * outPrice) / 1_000_000;

  const gsx1mTokens = Math.round(sumGsxTokens * scale1m);
  const gsx1mIn = sumGsxIn * scale1m;
  const gsx1mOut = sumGsxOut * scale1m;
  const gsx1mCost = (gsx1mIn * inPrice + gsx1mOut * outPrice) / 1_000_000;

  const cost1mSaved = base1mCost - gsx1mCost;
  const tokens1mSaved = 1_000_000 - gsx1mTokens;

  if (gsx1mTokens !== 325249) {
    fail(`1M scale GSD-X tokens mismatch: ${gsx1mTokens} !== 325249`);
  }
  if (tokens1mSaved !== 674751) {
    fail(`1M scale tokens saved mismatch: ${tokens1mSaved} !== 674751`);
  }
  if (Math.round(base1mCost * 100) / 100 !== 20.47) {
    fail(`1M scale baseline cost mismatch: ${base1mCost.toFixed(4)} !== 20.47`);
  }
  if (Math.round(gsx1mCost * 100) / 100 !== 13.72) {
    fail(`1M scale GSD-X cost mismatch: ${gsx1mCost.toFixed(4)} !== 13.72`);
  }
  if (Math.round(cost1mSaved * 100) / 100 !== 6.75) {
    fail(`1M scale net cost saved mismatch: ${cost1mSaved.toFixed(4)} !== 6.75`);
  }

  console.log(`  ✓ 1M Baseline Tokens:  1,000,000 tokens -> $${base1mCost.toFixed(2)}`);
  console.log(`    1M GSD-X Equivalent: ${gsx1mTokens.toLocaleString()} tokens -> $${gsx1mCost.toFixed(2)}`);
  console.log(`    1M Net Savings:      ${tokens1mSaved.toLocaleString()} tokens (67.5%), $${cost1mSaved.toFixed(2)} (33.0%)`);

  const scale10m = 10_000_000 / sumBaseTokens;
  const gsx10mTokens = Math.round(sumGsxTokens * scale10m);
  const tokens10mSaved = 10_000_000 - gsx10mTokens;
  const base10mCost = base1mCost * 10;
  const gsx10mCost = gsx1mCost * 10;
  const cost10mSaved = base10mCost - gsx10mCost;

  console.log(`  ✓ 10M Baseline Tokens: 10,000,000 tokens -> $${base10mCost.toFixed(2)}`);
  console.log(`    10M GSD-X Equivalent:${gsx10mTokens.toLocaleString()} tokens -> $${gsx10mCost.toFixed(2)}`);
  console.log(`    10M Net Savings:     ${tokens10mSaved.toLocaleString()} tokens, $${cost10mSaved.toFixed(2)}`);

  const scale100m = 100_000_000 / sumBaseTokens;
  const gsx100mTokens = Math.round(sumGsxTokens * scale100m);
  const tokens100mSaved = 100_000_000 - gsx100mTokens;
  const base100mCost = base1mCost * 100;
  const gsx100mCost = gsx1mCost * 100;
  const cost100mSaved = base100mCost - gsx100mCost;

  console.log(`  ✓ 100M Baseline Tokens: 100,000,000 tokens -> $${base100mCost.toFixed(2)}`);
  console.log(`    100M GSD-X Equivalent:${gsx100mTokens.toLocaleString()} tokens -> $${gsx100mCost.toFixed(2)}`);
  console.log(`    100M Net Savings:     ${tokens100mSaved.toLocaleString()} tokens, $${cost100mSaved.toFixed(2)}`);

  console.log('\n[5] Verifying README.md Integrity:');
  if (!fs.existsSync(README_PATH)) {
    fail(`README.md not found at ${README_PATH}`);
  }

  const readmeContent = fs.readFileSync(README_PATH, 'utf-8');

  if (readmeContent.toLowerCase().includes('save up to 67.5%') || readmeContent.toLowerCase().includes('saves up to 67.5%')) {
    fail("README.md contains inaccurate 'up to 67.5%' claim! (67.5% is aggregate; individual scenarios reach up to 83.0%)");
  }

  for (const term of ['25,482', '8,288', '67.5%', '83.0%', '325,249', '674,751', '$20.47', '$13.72', '$6.75', '33.0%']) {
    if (!readmeContent.includes(term)) {
      fail(`README.md missing canonical benchmark figure: '${term}'`);
    }
    console.log(`  ✓ Found '${term}' in README.md`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(' GSD-X Benchmark Verification: PASS');
  console.log(' All figures are mathematically consistent, reproducible, and defensible.');
  console.log('═'.repeat(60));
}

if (require.main === module) {
  main();
}

module.exports = { main };
