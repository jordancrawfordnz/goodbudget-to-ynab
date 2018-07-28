let fs = require('fs');
let csv = require('fast-csv');
let ynab = require('ynab');
let BatchStream = require('batch-stream');
let moment = require('moment');
let hash = require('object-hash');

let args = process.argv.slice(2)

if (args.length < 4 || args.length > 6) {
    console.log("node import.js [GoodBudget input file] [YNAB Access Token] [YNAB budget ID] [YNAB account ID] [optional - date format, default: MM/DD/YYYY] [optional - rerun index, default: 0]")
    return;
}

runImport(...args)

async function runImport(inputFileName, ynabAccessToken, ynabBudgetId, ynabAccountId, dateFormat = "MM/DD/YYYY", rerunIndex = 0) {
    let stream = fs.createReadStream(inputFileName);
    let ynabAPI = new ynab.API(ynabAccessToken);

    try {
        let categoryGroups = await ynabAPI.categories.getCategories(ynabBudgetId);
        let categoryIds = categoryGroups.data.category_groups.reduce(function(accum, group) {
            group.categories.forEach((category) => accum[category.name] = category.id );
            return accum;
        }, {});
        
        let transactionHashes = {};
        stream
            .pipe(csv({headers: true}))
            .transform(function (row) {
                let envelopeName = row.Envelope.split(': ').pop();
    
                let categoryId = categoryIds[envelopeName];
                let date = moment(row.Date, dateFormat).toISOString();
                let truncatedPayeeName = row.Name.length == 0 ? null : row.Name.substring(0, 50);
                let amount = Math.round(parseFloat(row.Amount) * 1000);

                let transactionHash = hash.MD5(row);
                let occurenceIndex = transactionHashes[transactionHash] = (transactionHashes[transactionHash] || 0) + 1
                let importId = "GBI:" + hash.MD5(Object.assign({ occurence: occurenceIndex, rerun: rerunIndex }, row));

                let memo = row.Notes + row.Details;
                if (!categoryId && row.Envelope.length > 0) {
                    if (memo.length > 0) memo += " ";
                    memo += "Original envelope: " + row.Envelope;
                }
                let truncatedMemo = memo.substring(0, 100);

                let data = {
                    account_id: ynabAccountId,
                    category_id: categoryId,
                    date: date,
                    amount: amount,
                    payee_name: truncatedPayeeName,
                    memo: truncatedMemo,
                    cleared: 'cleared',
                    import_id: importId
                };

                return data;
            })
            .pipe(new BatchStream({ size: 200 }))
            .on("data", async function(transactions) {
                try {
                    let apiResult = await ynabAPI.transactions.bulkCreateTransactions(ynabBudgetId, { transactions: transactions });
                    let importResult = apiResult.data.bulk;
                    console.log("Imported " + importResult.transaction_ids.length + " transactions. " + importResult.duplicate_import_ids.length + " transactions were duplicates and not imported.");
                } catch (error) {
                    console.log('Something bad happened.');
                    console.log(error);
                    console.log('Transactions:');
                    console.log(transactions)
                    return 0;  
                }
            })
            .on("end", function(){
                console.log("Done!");
            })

        return 1;
    } catch (error) {
        console.log('Something bad happened.');
        console.log(error);
        return 0;  
    }
}

