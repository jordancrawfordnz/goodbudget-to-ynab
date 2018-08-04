let fs = require('fs');
let csv = require('fast-csv');
let ynab = require('ynab');
let reduce = require('stream-reduce');

let args = process.argv.slice(2)

if (args.length !== 3) {
    console.log("node find_missing_categories.js [GoodBudget input file] [YNAB Access Token] [YNAB budget ID]")
    return;
}

findMissingCategories(...args)

async function findMissingCategories(inputFileName, ynabAccessToken, ynabBudgetId) {
    let stream = fs.createReadStream(inputFileName);
    let ynabAPI = new ynab.API(ynabAccessToken);
    let excludedEnvelopes = ['[Unallocated]', ''];

    try {
        let categoryGroups = await ynabAPI.categories.getCategories(ynabBudgetId);
        let categoryNames = categoryGroups.data.category_groups.reduce(function(accum, group) {
            return accum.concat(group.categories.map((category) => category.name));
        }, []);

        stream
            .pipe(csv({headers: true}))
            .pipe(reduce(function(categories, row) {
                let envelopeName = row.Envelope.split(': ').pop();
                if (excludedEnvelopes.indexOf(envelopeName) === -1) categories.add(envelopeName);

                return categories;
            }, new Set([])))
            .on('data', function(categories) {
                console.log('=== Categories which are already setup ===');
                categories.forEach(function(category) {
                    if (categoryNames.indexOf(category) !== -1) console.log(category);
                });

                console.log('\n=== Categories which need to be setup ===');
                categories.forEach(function(category) {
                    if (categoryNames.indexOf(category) === -1) console.log(category);
                });
            })
    } catch (error) {
        console.log('Something bad happened.');
        console.log(error);
    }
}
