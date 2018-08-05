let moment = require('moment');

class RowInterpreter {
    constructor(row, ynabCategoryIds) {
        this.row = row;
        this.ynabCategoryIds = ynabCategoryIds;
    }

    getTransactionParts() {
        let parts = this.row.Details.split('||').reduce((parts, transactionPart) => {
            let envelopeAndAmount = transactionPart.split('|');
            if (envelopeAndAmount[0] !== '' && envelopeAndAmount.length === 2) parts.push(envelopeAndAmount);

            return parts;
        }, []);

        if (parts.length === 0) parts.push([this.row.Envelope, this.row.Amount]);

        return parts.map((part) => {
            let categoryId = this.categoryForEnvelope(part[0]);

            return {
                categoryId: categoryId,
                amount: this.amountAsMilliunits(part[1]),
                memo: this.memoForCategory(categoryId)
            };
        });
    }
    
    date(dateFormat) {
        return moment(this.row.Date, dateFormat).format('YYYY-MM-DD');
    }
    
    payeeName() {
        return this.row.Name.length == 0 ? null : this.row.Name.substring(0, 50);
    }
    
    memoForCategory(category) {
        let memo = this.row.Notes;

        if (!category && this.row.Envelope.length > 0) {
            if (memo.length > 0) memo += " ";
            memo += "Original envelope: " + this.row.Envelope;
        }
        let truncatedMemo = memo.substring(0, 100);
        
        return truncatedMemo;
    }
    
    categoryForEnvelope(envelope) {
        let envelopeName = envelope.split(': ').pop();

        // Handle income by converting unallocated parts to money to be budgeted.
        if (envelopeName === '[Unallocated]') envelopeName = 'To be Budgeted';

        return this.ynabCategoryIds[envelopeName];
    }

    amountAsMilliunits(rawAmount) {
        let amount = parseFloat(rawAmount.replace(',', ''));
        
        return Math.round(amount * 1000);
    }
}

module.exports = RowInterpreter;