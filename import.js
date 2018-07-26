let fs = require('fs');
let csv = require('fast-csv');
let BatchStream = require('batch-stream')

if (process.argv.length !== 4) {
    console.log("node import.js [GoodBudget input file] [YNAB API key]")
    return;
}

let inputFileName = process.argv[2];
let ynabApiKey = process.argv[3];
// TODO: Accept budget and account IDs.

let stream = fs.createReadStream(inputFileName);

stream
    .pipe(csv({headers: true}))
    .transform(function (row) {
        // TODO: Transform into something which YNAB can handle.

        return row.Date;
    })
    .pipe(new BatchStream({size: 50}))
    .on("data", function(data){
        console.log(data);
        console.log(data.length)
        // TODO: Send to YNAB.
    })
    .on("end", function(){
        console.log("done");
    })
