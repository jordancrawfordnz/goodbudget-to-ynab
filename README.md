# GoodBudget to YNAB Importer

## What is this?
[YNAB (You Need a Budget)](https://www.youneedabudget.com/) and [GoodBudget](https://goodbudget.com/) are personal finance apps.

I've used GoodBudget for a few years but wanted to give YNAB a try. In order to give it a good go I wanted to import my data over from GoodBudget.

GoodBudget allows users to export transactions from an account to a CSV file. This has the columns:
* Date
* Envelope
* Account
* Name
* Notes
* Amount
* Status
* Details

YNAB has a CSV upload feature but this is designed to get transactions from an export from your bank account but it doesn't know how to link up the GoodBudget Envelope to the YNAB category. No one wants to re-categorise 1000+ transactions!

Fortunately, YNAB has an API which lets users upload transactions. This project takes your GoodBudget CSV files, reformats them a bit, then pushes them up to your YNAB account!

## What does it do?
* Matches the envelope name to a YNAB category name.
* Combines the "Notes" and "Details" fields in the GoodBudget export to the memo field in YNAB.
* Uploads transactions to YNAB in batches of 200. The YNAB API limit is 200 req/hour so do files with 40k+ transactions in smaller batches.
* Marks all transactions as 'cleared' but won't automatically approve them - this way you'll still get a chance to review the transactions in YNAB.
* Uses the `import_id` field when uploading in order to prevent duplicate transactions being uploaded. YNAB uses this to decide if the transaction already exists. The importer attempts to uniquely identify transactions within the file such that re-importing the same file (or part of the file, as long as it's split by day) won't result in the transaction being imported again.

## What can't it do?
* GoodBudget lists transactions for deleted envelopes without an envelope and with a mention of the envelope in the "Details" column. These will import without a category so you'll need to fix it youself from the memo field.
* The YNAB API doesn't currently support split transactions, so you'll need to sort these out yourself. Similar to deleted envelopes, these mention the splits in the "Details" column which will come through in the memo.
* The YNAB API doesn't currently support transfer transactions, so you'll also need to manually assign the payee to the transaction to make it a transfer. Unfortunately, when these are created within GoodBudget these come through on the export as "Account Transfer" without any details about which account, so you'll need to figure out which account they belong to again.
* Where an envelope can't be found in YNAB (e.g.: deleted or renamed envelopes), the original GoodBudget envelope name will be included in the memo.

## How do I use it?
### Setting up on your computer
1. [Install Node on your computer](https://nodejs.org/en/download/)
2. Clone this repo.
3. Run `npm install` to install dependencies.
4. Follow the below instructions to run the importer.

### Getting data from GoodBudget
The importer has been designed to import one account at a time. Lets download a CSV for one of your accounts.

1. Login to GoodBudget.
2. Click the "Accounts" tab.
3. Select one of your accounts.
4. Click the "Export CSV" button.

### Preparing YNAB
1. Go to the ["Developer Settings"](https://app.youneedabudget.com/settings/developer) page under your YNAB "My Account" page. Click "New Token", confirm your password and click "Generate".
2. Take a note of the token that shows at the top of the page - this is the only time you will get this so you don't want to lose it!
3. Head back into your budget and setup your YNAB categories with the same name as your GoodBudget envelopes. We need to do this before running an import because the importer needs to provide the `category_id` to the YNAB API, so must request a list of your categories in order to match your transactions. Don't worry about the category group as these are ignored.
4. On the sidebar, click on the account you want to import. Now lets grab the budget and account ID from the URL. This has the format: `https://app.youneedabudget.com/[budget ID]/accounts/[account ID]`

### Running the importer
Run the importer with the following command:

`node import.js [GoodBudget input file] [YNAB Access Token] [YNAB budget ID] [YNAB account ID] [optional - date format] [optional - rerun index]`

* **GoodBudget input file:** This is the path to the CSV file you downloaded from GoodBudget above.

* **YNAB Access Token:** This is the access token we generate from YNAB above.

* **YNAB budget ID:** This is the YNAB budget ID we grabbed from the page URL above.

* **YNAB account ID:** This is the YNAB account ID we grabbed from the page URL above.

* **Date format** (default: `MM/DD/YYY`):

GoodBudget lets you set your preferred date format in the settings. This defaults to the US format of `MM/DD/YYYY` but if you're like me and use `DD/MM/YYYY` in GoodBudget then you'll need to provide this as an argument.

* **Re-run index** (default: 0):

This is a bit of a weird option that you probably don't need to use. This relates to the `import_id` we provide to YNAB. While experimenting with the importer I wanted to delete my transactions but even after deleting the transactions YNAB still recognised the transactions as being duplicates. If you ever do want to re-import transactions on purpose then just set this to a different value to any previous exports and the `import_ids` will all change!