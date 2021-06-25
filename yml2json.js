#!/usr/bin/env node

const fs = require('fs');
const YAML = require('yaml');

if (process.argv.length == 3) {
    const yml = fs.readFileSync(process.argv[2], 'utf8');
    const data = YAML.parse(yml);
    console.log(JSON.stringify(data, null, ' '));
}
else {
    console.log(`Usage: ${process.argv[1]} <file.yml>`);
}
