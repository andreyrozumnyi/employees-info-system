# employees-info-system
Small CLI for employees information system

## Requirements

- Node 8.9 (follow `.nvmrc`, just execute `nvm use` if you have nvm installed)
- The development is done using `npm v6.1.0`

## Usage

- execute `npm install` first
- execute `./index.js -h` or `./index.js --help` for help output of the script
- execute `vacation <year> <input-file> [output-file]` to run vacation calculation command.
You can use `vac` as an alias instead of `vacation`. `output-file` parameter is optional.
In case you do not provide it, the file will be created based on input file name.

## Development and Quality

- execute `npm run lint` to check linting errors
- execute `npm test` to run available unit tests
- execute `npm run test:watch` if you are developing unit tests as it allows to watch on changes
- execute `npm run coverage` to see coverage report
