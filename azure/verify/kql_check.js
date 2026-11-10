// Parse KQL (the query language of Log Analytics and Azure Data Explorer) with the Kusto language service of Microsoft, and print syntax errors.
// It checks syntax only. It has no table schemas, so it cannot tell that a table or a column does not exist.
// Usage: node azure/verify/kql_check.js queries.json      queries.json is a JSON array of strings. Prints one JSON line per query.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'node_modules', '@kusto', 'language-service-next');
global.window = global;
(0, eval)(fs.readFileSync(path.join(dir, 'bridge.js'), 'utf8'));
(0, eval)(fs.readFileSync(path.join(dir, 'Kusto.Language.Bridge.js'), 'utf8'));
const K = global.Kusto;

const queries = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const q of queries) {
  const diags = K.Language.KustoCode.Parse(q).GetDiagnostics();
  const errors = [];
  for (let i = 0; i < diags.Count; i++) errors.push(diags.getItem(i).Message);
  console.log(JSON.stringify({ query: q, valid: errors.length === 0, errors: errors }));
}
