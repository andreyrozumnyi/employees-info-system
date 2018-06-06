const proxyquire = require('proxyquire');
const sinon = require('sinon');

const MIN_VACATION_DAYS = 26;

const loggerMock = {};
const tableMock = {};

const vacation = proxyquire('lib/vacation', {
	'signale': loggerMock,
	'./utils/csv-file': tableMock,
});

describe('lib/vacation.js', () => {
	beforeEach(async () => {
		loggerMock.warn = sinon.spy();
		loggerMock.error = sinon.spy();
		tableMock.write = sinon.spy();
	});

	it('should not validate that year is correct', async () => {
		await vacation.calculate('a2017', 'input.csv', 'output.csv');

		sinon.assert.calledWith(loggerMock.error, 'Year is not valid');
		sinon.assert.notCalled(tableMock.write);
	});

	it('should create output filename if not provided based on input file name', async () => {
		tableMock.read = sinon.stub().returns([]);

		await vacation.calculate('2017', 'input.csv');

		sinon.assert.calledWith(tableMock.write, './input_vacation_2017.csv');
	});

	describe('should not validate employee if', () => {
		it('name is missing', async () => {
			const employee = {
				'Name': '',
				'Date of birth': '30.12.1950',
				'Start date': '01.01.2001',
				'Special contract': '27 days',
			};

			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2017', 'input.csv', 'output.csv');

			sinon.assert.calledWith(loggerMock.warn, `The following row is not valid: ${Object.values(employee).join(', ')}`);
			sinon.assert.calledWith(tableMock.write, 'output.csv', [{days: null, name: ''}]);
		});

		it('birthday is invalid', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': 'a30.12.1950',
				'Start date': '01.01.2001',
				'Special contract': '27 days',
			};

			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2017', 'input.csv', 'output.csv');

			sinon.assert.calledWith(loggerMock.warn, `The following row is not valid: ${Object.values(employee).join(', ')}`);
			sinon.assert.calledWith(tableMock.write, 'output.csv', [{days: null, name: 'Hans'}]);
		});

		it('start day is invalid', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '30.12.1950',
				'Start date': '01.01.2001a',
				'Special contract': '27 days',
			};

			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2017', 'input.csv', 'output.csv');

			sinon.assert.calledWith(loggerMock.warn, `The following row is not valid: ${Object.values(employee).join(', ')}`);
			sinon.assert.calledWith(tableMock.write, 'output.csv', [{days: null, name: 'Hans'}]);
		});
	});

	it('should apply minimum days rule', async () => {
		const employee = {
			'Name': 'Hans',
			'Date of birth': '01.01.2000',
			'Start date': '01.01.2016',
			'Special contract': '',
		};
		const outputFile = 'output.csv';
		tableMock.read = sinon.stub().returns([employee]);

		await vacation.calculate('2018', 'input.csv', outputFile);

		sinon.assert.calledWith(tableMock.write, outputFile, [{
			name: 'Hans',
			days: MIN_VACATION_DAYS,
		}]);
	});

	describe('should apply additional days by age rule', () => {
		it('when person is at least 30 y.o', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '01.01.1970',
				'Start date': '01.01.1998',
				'Special contract': '',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2000', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, outputFile, [{
				name: 'Hans',
				days: MIN_VACATION_DAYS + 1,
			}]);
		});

		it('when person is getting at least 30 y.o. in that year irregardless when exactly', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '31.12.1970',
				'Start date': '01.01.1998',
				'Special contract': '',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2000', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, outputFile, [{
				name: 'Hans',
				days: MIN_VACATION_DAYS + 1,
			}]);
		});

		it('every 5 years do get one additional vacation day when person is at least 30 y.o.', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '01.01.1965',
				'Start date': '01.01.1998',
				'Special contract': '',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2000', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, outputFile, [{
				name: 'Hans',
				days: MIN_VACATION_DAYS + 2,
			}]);
		});
	});

	describe('should apply special contract rule', () => {
		it('that overwrites the amount of vacation days', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '31.12.1965',
				'Start date': '01.01.1998',
				'Special contract': '30 vacation days',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2000', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, outputFile, [{
				name: 'Hans',
				days: 30,
			}]);
		});

		it('that overwrites the amount of vacation days even if it is smaller than by minimum days rule', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '31.12.1965',
				'Start date': '01.01.1998',
				'Special contract': '14 vacation days',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2000', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, outputFile, [{
				name: 'Hans',
				days: 14,
			}]);
		});
	});

	it('should give a warning when employee has started not in allowed days', async () => {
		const employee = {
			'Name': 'Hans',
			'Date of birth': '31.12.1965',
			'Start date': '10.01.1998',
			'Special contract': '',
		};
		const outputFile = 'output.csv';
		tableMock.read = sinon.stub().returns([employee]);

		await vacation.calculate('2000', 'input.csv', outputFile);

		sinon.assert.calledWith(loggerMock.warn, 'Hans started not in a correct day. Please doable check it.');
		sinon.assert.called(tableMock.write);
	});

	describe('should apply newcomers rule', () => {
		it('that carries over 1/12 of the their yearly vacation days to the 2-nd year', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '01.01.2000',
				'Start date': '01.12.2017',
				'Special contract': '',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2018', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, 'output.csv', [{
				name: 'Hans',
				days: +(MIN_VACATION_DAYS / 12).toFixed(1) + MIN_VACATION_DAYS,
			}]);
		});

		it('that carries over days to the 2-nd year even if person has started not in January', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '01.01.2000',
				'Start date': '01.08.2017',
				'Special contract': '',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2018', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, 'output.csv', [{
				name: 'Hans',
				days: +(MIN_VACATION_DAYS / 12).toFixed(1) + MIN_VACATION_DAYS,
			}]);
		});

		it('that newcomers in January will not get vacation days the same year', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '01.01.2000',
				'Start date': '01.12.2017',
				'Special contract': '',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2017', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, 'output.csv', [{
				name: 'Hans',
				days: 0,
			}]);
		});

		it('that newcomers will get amount of vacation days proportional to remaining months (without last month)', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '01.01.2000',
				'Start date': '01.11.2017',
				'Special contract': '',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2017', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, 'output.csv', [{
				name: 'Hans',
				days: +(MIN_VACATION_DAYS / 12).toFixed(1),
			}]);
		});

		it('that newcomers will get 1/12 of the their yearly vacation days irregardless of starting day', async () => {
			const employee = {
				'Name': 'Hans',
				'Date of birth': '01.01.2000',
				'Start date': '15.11.2017',
				'Special contract': '',
			};
			const outputFile = 'output.csv';
			tableMock.read = sinon.stub().returns([employee]);

			await vacation.calculate('2017', 'input.csv', outputFile);

			sinon.assert.calledWith(tableMock.write, 'output.csv', [{
				name: 'Hans',
				days: +(MIN_VACATION_DAYS / 12).toFixed(1),
			}]);
		});
	});
});
