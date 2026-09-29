import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const INITIAL_BALANCE_CENTS = 100_000;
const MAX_VALUE_CENTS = 99_999_999;

function formatAmount(cents) {
  const wholeUnits = Math.floor(cents / 100);
  const fractionalUnits = String(cents % 100).padStart(2, '0');
  return `${String(wholeUnits).padStart(6, '0')}.${fractionalUnits}`;
}

function parseAmount(input) {
  const value = input.trim();
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const [wholeUnits, fractionalUnits = ''] = value.split('.');
  return Number(wholeUnits) * 100 + Number(fractionalUnits.padEnd(2, '0'));
}

function displayMenu(output) {
  output.write('--------------------------------\n');
  output.write('Account Management System\n');
  output.write('1. View Balance\n');
  output.write('2. Credit Account\n');
  output.write('3. Debit Account\n');
  output.write('4. Exit\n');
  output.write('--------------------------------\n');
}

export async function runAccountApp(input = stdin, output = stdout) {
  const rl = createInterface({ input, output });
  let balanceCents = INITIAL_BALANCE_CENTS;
  let state = 'menu';

  try {
    displayMenu(output);
    output.write('Enter your choice (1-4): ');

    for await (const line of rl) {
      const value = line.trim();

      if (state === 'menu') {
        if (value === '1') {
          output.write(`Current balance: ${formatAmount(balanceCents)}\n`);
          displayMenu(output);
          output.write('Enter your choice (1-4): ');
        } else if (value === '2' || value === '3') {
          state = value === '2' ? 'credit' : 'debit';
          output.write(`Enter ${state} amount: `);
        } else if (value === '4') {
          output.write('Exiting the program. Goodbye!\n');
          return;
        } else {
          output.write('Invalid choice, please select 1-4.\n');
          displayMenu(output);
          output.write('Enter your choice (1-4): ');
        }
        continue;
      }

      const amountCents = parseAmount(value);
      if (amountCents === null) {
        output.write('Enter a non-negative amount with up to six digits and two decimal places.\n');
        output.write(`Enter ${state} amount: `);
        continue;
      }

      if (state === 'credit' && balanceCents + amountCents > MAX_VALUE_CENTS) {
        output.write('Credit would exceed the maximum supported balance.\n');
      } else if (state === 'credit') {
        balanceCents += amountCents;
        output.write(`Amount credited. New balance: ${formatAmount(balanceCents)}\n`);
      } else if (balanceCents >= amountCents) {
        balanceCents -= amountCents;
        output.write(`Amount debited. New balance: ${formatAmount(balanceCents)}\n`);
      } else {
        output.write('Insufficient funds for this debit.\n');
      }

      state = 'menu';
      displayMenu(output);
      output.write('Enter your choice (1-4): ');
    }

    output.write('Exiting the program. Goodbye!\n');
  } finally {
    rl.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runAccountApp();
}
