let hash = require('object-hash');
let RowInterpreter = require('./row_interpreter');

class DataTransformer {
    constructor(ynabAPI, ynabBudgetId, ynabAccountId, dateFormat, rerunIndex) {
        this.ynabAPI = ynabAPI;
        this.ynabBudgetId = ynabBudgetId;
        this.ynabAccountId = ynabAccountId;
        this.dateFormat = dateFormat;
        this.rerunIndex = rerunIndex;

        this.transactionHashes = {};
    }

    async transformRow(row) {
        let rowInterpreter = new RowInterpreter(row, await this.ynabCategoryIds());

        let baseTransaction = {
            account_id: this.ynabAccountId,
            date: rowInterpreter.date(this.dateFormat),
            payee_name: rowInterpreter.payeeName(),
            cleared: 'cleared'
        };
        
        return rowInterpreter.getTransactionParts().map((transactionPart, partIndex) => {            
            return Object.assign({
                category_id: transactionPart.categoryId,
                amount: transactionPart.amount,
                memo: transactionPart.memo,
                import_id: this.calculateImportIdForTransaction(row, partIndex)
            }, baseTransaction);
        });
    }

    calculateImportIdForTransaction(row, part) {
        let transactionHash = hash.MD5(row);
        let occurenceIndex = this.transactionHashes[transactionHash] = (this.transactionHashes[transactionHash] || 0) + 1
        let importId = "GBI:" + hash.MD5(Object.assign({ part: part, occurence: occurenceIndex, rerun: this.rerunIndex }, row));

        return importId;
    }

    ynabCategoryIds() {
        return this.ynabCategoryIdsPromise = this.ynabCategoryIdsPromise || (async () => {
            try {
                let categoryGroups = await this.ynabAPI.categories.getCategories(this.ynabBudgetId);

                return categoryGroups.data.category_groups.reduce((accum, group) => {
                    group.categories.forEach((category) => accum[category.name] = category.id );
                    return accum;
                }, {});
            } catch (error) {
                console.log('Could not fetch category IDs from YNAB. Exiting.');
                console.log(error);
                process.exit(1);
            }
        })();
    }
}

module.exports = DataTransformer;