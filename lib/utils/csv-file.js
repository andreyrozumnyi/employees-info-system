const fs = require('fs');
const csv = require('csvtojson');
const json2csv = require('json2csv').parse;

async function read(path) {
	return await csv().fromFile(path);
}

function write(path, data, fields) {
	const csv = json2csv(data, { fields });

	fs.writeFileSync(path, csv);
}

module.exports = {
	read,
	write,
};
