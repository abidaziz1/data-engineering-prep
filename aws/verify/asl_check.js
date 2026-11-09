// Validate Step Functions state machine definitions (Amazon States Language) with asl-validator.
// Usage: node aws/verify/asl_check.js file.json [file2.json ...]   prints one JSON line for each file.
const path = require('path');
const fs = require('fs');
const validator = require(path.join(__dirname, 'node_modules', 'asl-validator'));
for (const f of process.argv.slice(2)) {
  const r = validator(JSON.parse(fs.readFileSync(f, 'utf8')));
  const errors = (r.errors || []).map(e => (e['Error code'] || 'ERROR') + ': ' + String(e.Message || '').replace(/\s+/g, ' '));
  console.log(JSON.stringify({ file: path.basename(f), valid: r.isValid, errors: errors }));
}
