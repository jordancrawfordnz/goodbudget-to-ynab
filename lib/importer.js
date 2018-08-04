let fs = require('fs');
let csv = require('fast-csv');
let BatchStream = require('batch-stream');
let ynab = require('ynab');
let DataTransformer = require('./data_transformer')

class Importer {
    constructor(inputFileName, ynabAccessToken, ynabBudgetId, ynabAccountId, dateFormat = "MM/DD/YYYY", rerunIndex = "0") {
        this.inputFileName = inputFileName;
        this.ynabBudgetId = ynabBudgetId;

        this.ynabAPI = new ynab.API(ynabAccessToken);
        this.dataTransformer = new DataTransformer(this.ynabAPI, this.ynabBudgetId, ynabAccountId, dateFormat, rerunIndex);
    }

    run() {
        let stream = fs.createReadStream(this.inputFileName);

        stream
            .pipe(csv({headers: true}))
            .transform((row) => (this.dataTransformer.transformRow(row)))
            .pipe(new BatchStream({ size: 200 }))
            .on('data', async (transactionPromises) => {
                try {
                    let transactions = await Promise.all(transactionPromises)

                    let apiResult = await this.ynabAPI.transactions.bulkCreateTransactions(this.ynabBudgetId, { transactions: transactions });
                    let importResult = apiResult.data.bulk;
                    console.log("Imported " + importResult.transaction_ids.length + " transactions. " + importResult.duplicate_import_ids.length + " transactions were duplicates and not imported.");
                } catch (error) {
                    console.log('Something went wrong with this batch.');
                    console.log(error);
                }
            })
    }
}

module.exports = Importer;