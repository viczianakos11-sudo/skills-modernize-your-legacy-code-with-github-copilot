import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { runAccountApp } from '../index.js';

async function runSession(inputs) {
  const input = new PassThrough();
  const output = new PassThrough();
  let outputText = '';

  output.setEncoding('utf8');
  output.on('data', (chunk) => {
    outputText += chunk;
  });

  input.end(`${inputs.join('\n')}\n`);
  await runAccountApp(input, output);
  return outputText;
}

function countOccurrences(text, value) {
  return [...text.matchAll(new RegExp(value, 'g'))].length;
}

test('TC-001: startup displays all menu options and initial balance', async () => {
  const output = await runSession(['1', '4']);

  for (const option of ['1. View Balance', '2. Credit Account', '3. Debit Account', '4. Exit']) {
    assert.ok(output.includes(option), `Expected menu option: ${option}`);
  }
  assert.ok(output.includes('Current balance: 001000.00'));
});

test('TC-002: repeated balance views do not change the balance', async () => {
  const output = await runSession(['1', '1', '4']);

  assert.equal(countOccurrences(output, 'Current balance: 001000.00'), 2);
});

test('TC-003: whole-number credit updates the balance', async () => {
  const output = await runSession(['2', '250', '1', '4']);

  assert.ok(output.includes('Amount credited. New balance: 001250.00'));
  assert.ok(output.includes('Current balance: 001250.00'));
});

test('TC-004: credit preserves cents', async () => {
  const output = await runSession(['2', '12.34', '1', '4']);

  assert.ok(output.includes('Amount credited. New balance: 001012.34'));
  assert.ok(output.includes('Current balance: 001012.34'));
});

test('TC-005: zero credit succeeds without changing the balance', async () => {
  const output = await runSession(['2', '0', '1', '4']);

  assert.ok(output.includes('Amount credited. New balance: 001000.00'));
  assert.ok(output.includes('Current balance: 001000.00'));
});

test('TC-006: debit below available balance updates the balance', async () => {
  const output = await runSession(['3', '250', '1', '4']);

  assert.ok(output.includes('Amount debited. New balance: 000750.00'));
  assert.ok(output.includes('Current balance: 000750.00'));
});

test('TC-007: debit equal to available balance is allowed', async () => {
  const output = await runSession(['3', '1000', '1', '4']);

  assert.ok(output.includes('Amount debited. New balance: 000000.00'));
  assert.ok(output.includes('Current balance: 000000.00'));
});

test('TC-008: unaffordable debit is declined without changing the balance', async () => {
  const output = await runSession(['3', '1000.01', '1', '4']);

  assert.ok(output.includes('Insufficient funds for this debit.'));
  assert.ok(output.includes('Current balance: 001000.00'));
  assert.ok(!output.includes('Amount debited.'));
});

test('TC-009: balance carries across multiple operations', async () => {
  const output = await runSession(['2', '100', '3', '40', '1', '4']);

  assert.ok(output.includes('Amount credited. New balance: 001100.00'));
  assert.ok(output.includes('Amount debited. New balance: 001060.00'));
  assert.ok(output.includes('Current balance: 001060.00'));
});

test('TC-010: invalid menu choices show an error and preserve the balance', async () => {
  const output = await runSession(['0', '5', '1', '4']);

  assert.equal(countOccurrences(output, 'Invalid choice, please select 1-4.'), 2);
  assert.ok(output.includes('Current balance: 001000.00'));
});

test('TC-011: exit displays goodbye and ends the session', async () => {
  const output = await runSession(['4']);
  const goodbyeIndex = output.indexOf('Exiting the program. Goodbye!');

  assert.notEqual(goodbyeIndex, -1);
  assert.ok(!output.slice(goodbyeIndex).includes('Account Management System'));
});

test('TC-012: a new session resets the in-memory balance', async () => {
  const firstSession = await runSession(['2', '250', '4']);
  const secondSession = await runSession(['1', '4']);

  assert.ok(firstSession.includes('Amount credited. New balance: 001250.00'));
  assert.ok(secondSession.includes('Current balance: 001000.00'));
});

test('TC-013: balance can reach the maximum representable value', async () => {
  const output = await runSession(['2', '998999.99', '1', '4']);

  assert.ok(output.includes('Amount credited. New balance: 999999.99'));
  assert.ok(output.includes('Current balance: 999999.99'));
});

test('TC-014: Node characterization rejects credit beyond the maximum', async () => {
  const output = await runSession(['2', '998999.99', '2', '0.01', '1', '4']);

  assert.ok(output.includes('Credit would exceed the maximum supported balance.'));
  assert.ok(output.includes('Current balance: 999999.99'));
});

test('TC-015: Node characterization rejects amounts beyond the input range', async () => {
  const output = await runSession(['3', '1000000', '1', '1', '4']);

  assert.ok(output.includes('Enter a non-negative amount with up to six digits and two decimal places.'));
  assert.ok(output.includes('Amount debited. New balance: 000999.00'));
  assert.ok(output.includes('Current balance: 000999.00'));
});

test('TC-016: Node characterization rejects negative amounts and accepts a retry', async () => {
  const output = await runSession(['2', '-1', '1', '1', '4']);

  assert.ok(output.includes('Enter a non-negative amount with up to six digits and two decimal places.'));
  assert.ok(output.includes('Amount credited. New balance: 001001.00'));
  assert.ok(output.includes('Current balance: 001001.00'));
});

test('TC-017: Node characterization rejects non-numeric amounts and accepts a retry', async () => {
  const output = await runSession(['3', 'abc', '1', '1', '4']);

  assert.ok(output.includes('Enter a non-negative amount with up to six digits and two decimal places.'));
  assert.ok(output.includes('Amount debited. New balance: 000999.00'));
  assert.ok(output.includes('Current balance: 000999.00'));
});
