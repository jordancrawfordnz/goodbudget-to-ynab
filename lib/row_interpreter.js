let moment = require('moment');

class RowInterpreter {
    constructor(row, ynabCategoryIds) {
        this.row = row;
        this.ynabCategoryIds = ynabCategoryIds;
    }

    categoryId() {
        let envelopeName = this.row.Envelope.split(': ').pop();

        return this.ynabCategoryIds[envelopeName];
    }

    date(dateFormat) {
        return moment(this.row.Date, dateFormat).format("YYYY-MM-DD");
    }

    amount() {
        return Math.round(parseFloat(this.row.Amount) * 1000);
    }

    payeeName() {
        return this.row.Name.length == 0 ? null : this.row.Name.substring(0, 50);
    }

    memo() {
        let memo = this.row.Notes + this.row.Details;

        if (!this.categoryId() && this.row.Envelope.length > 0) {
            if (memo.length > 0) memo += " ";
            memo += "Original envelope: " + this.row.Envelope;
        }
        let truncatedMemo = memo.substring(0, 100);

        return truncatedMemo;
    }
}

module.exports = RowInterpreter;