const moment = require('moment');
const path = require('path');
const signale = require('signale');

const table = require('./utils/csv-file');

const MIN_VACATION_DAYS = 26;
const MIN_AGE_FOR_ADDITIONAL_DAYS = 30;
const PERIOD_FOR_ADDITIONAL_DAY = 5;

const startDays = [1, 15];

async function calculate(year, inputFile, outputFile) {
	year = parseInt(year, 10);
	if (isNaN(year)) {
		return signale.error('Year is not valid');
	}

	try {
		const rows = await table.read(inputFile);
		const output = [];

		rows.map(row => {
			const employee = parseRow(row);
			const {name, days} = processEmployee(employee, year);

			output.push({
				name,
				days,
			});
		});

		outputFile = outputFile ? outputFile : `./${path.basename(inputFile, '.csv')}_vacation_${year}.csv`;
		table.write(outputFile, output, ['name', 'days']);
	} catch (err) {
		signale.error(`Failed to calculate vacation days. Error: ${err.message}`);
	}
}

function parseRow(row) {
	const parsed = {};

	Object.entries(row).map(([key, value]) => {
		key = key.toLowerCase();
		value = value.trim();

		if (key.includes('name')) {
			parsed.name = value;
		} else if (key.includes('birth')) {
			parsed.birth = moment(value, 'DD.MM.YYYY', true);
		} else if (key.includes('start')) {
			parsed.start = moment(value, 'DD.MM.YYYY', true);
		} else if (key.includes('contract')) {
			parsed.contract = value;
		}
	});

	return parsed;
}

function processEmployee(employee, year) {
	const result = {
		name: employee.name,
		days: null,
		// amount of days carried to the next week
		carried: 0,
	};

	if (!isEmployeeValid(employee)) {
		signale.warn(`Information is not valid for ${employee.name}`);
		return result;
	}

	employee.days = 0;

	// let's apply all the rules one by one
	applyMinimumDaysRule(employee);
	applyAdditionalDaysByAgeRule(employee, year);
	applySpecialContractRule(employee);
	applyNewcomersRule(employee, year);
	checkStartDayRule(employee);

	result.days = isNaN(employee.days) ? null : +employee.days.toFixed(1);
	result.carried = employee.carried;

	return result;
}

function isEmployeeValid(employee) {
	return employee.name && employee.birth.isValid() && employee.start.isValid();
}

function applyMinimumDaysRule(employee) {
	employee.days += MIN_VACATION_DAYS;
}

function applyAdditionalDaysByAgeRule(employee, year) {
	const ageInTheYear = year - employee.birth.year();
	const difference = ageInTheYear - MIN_AGE_FOR_ADDITIONAL_DAYS;

	employee.days += difference >= 0 ? Math.floor(difference / PERIOD_FOR_ADDITIONAL_DAY) + 1 : 0;
}

function applySpecialContractRule(employee) {
	if (!employee.contract) {
		return;
	}

	employee.days = parseInt(employee.contract);

	if (isNaN(employee.days)) {
		signale.warn(`Invalid special contract for ${employee.name}`);
	}
}

function applyNewcomersRule(employee, year) {
	const startYear = employee.start.year();
	let days = employee.days;
	// 0-based month number
	const startMonth = employee.start.month();

	if (startYear === year) {
		employee.carried = days / 12;
		days = days * (11 - startMonth) / 12;
	} else if (startYear + 1 ===  year) {
		days += processEmployee(employee, year - 1).carried;
	} else if (startYear > year) {
		days = NaN;
		signale.warn(`${employee.name} did not work in ${year}`);
	}

	employee.days = days;
}

function checkStartDayRule(employee) {
	if (!startDays.includes(employee.start.date())) {
		signale.warn(`${employee.name} started not in a correct day. Please doable check it.`);
	}
}

module.exports = {
	calculate,
};
