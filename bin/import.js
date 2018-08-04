let Importer = require('../lib/importer');
let args = process.argv.slice(2)

if (args.length < 4 || args.length > 6) {
    console.log("node import.js [GoodBudget input file] [YNAB Access Token] [YNAB budget ID] [YNAB account ID] [optional - date format, default: MM/DD/YYYY] [optional - rerun index, default: 0]")
    return;
}

let importer = new Importer(...args);
importer.run();
