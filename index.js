#!/usr/bin/env node

const program = require('commander');
const signale = require('signale');

const vacation = require('./lib/vacation.js');

let started = false;

program
	.version('1.0.0', '-v, --version')
	.description('Employees information system');

program
	.command('vacation <year> <input-file> [output-file]')
	.alias('vac')
	.description('Calculate vacation days for a given year')
	.action(async (...args) => {
		started = true;
		await vacation.calculate(...args);
	});

program.parse(process.argv);

if (!started) {
	signale.warn('Cannot find a command. Please see help for it...');
	program.help();
}
