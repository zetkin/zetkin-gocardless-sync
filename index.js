const config = require('./config.json');
const { initZetkin } = require('./lib/zetkin');
const gocardless = require('./lib/gocardless');

(async () => {
    gocardless.initClient(config);

    const Z = await initZetkin(config);
    /*
    try {
        const data = await Z.resource('users', 'me').get();
        console.log(data);
    }
    catch (err) {
        console.error(err);
    }

    const payments = await gocardless.loadPayments({
        created_at: {
            gt: '2021-01-01T00:00:00.000Z',
            lt: '2021-02-01T00:00:00.000Z',
        },
    });
    console.log(JSON.stringify(payments, null, '  '));

    const data = await gocardless.loadMandates();
    console.log(JSON.stringify(data, null, '  '));
    */

    /*
    try {
        const people = await Z.resource('orgs', config.ZETKIN_ORG_ID, 'people').get();
        const data = people.data.data;
        console.log(JSON.stringify(data, null, '  '));
    }
    catch (err) {
        console.error(err);
    }
    */

    const tag = await Z.resource('orgs', config.ZETKIN_ORG_ID, 'people', 'tags').post({
        'title': '000 Paid test',
    });

    const payments = require('./.cache/payments.json');
    const customers = require('./.cache/customers.json');
    const mandates = require('./.cache/mandates.json');
    const people = require('./.cache/people.json');

    const report = {
        foundInZetkin: [],
        missingInZetkin: [],
        zetkinChecklist: people
            .map(p => p.gocardless_id)
            .filter(id => !!id)
            .reduce((checklist, id) => {
                checklist[id] = false;
                return checklist;
            }, {}),
    };

    for (const payment of payments) {
        const mandate = mandates.find(m => m.id == payment.links.mandate);
        const customerId = mandate.links.customer;

        const person = people.find(p => p.gocardless_id == customerId);
        if (person) {
            report.foundInZetkin.push(person);
            report.zetkinChecklist[customerId] = true;

            console.log('Tagging');
            try {
                await Z.resource('orgs', config.ZETKIN_ORG_ID, 'people', person.id, 'tags', tag.data.data.id).put();
                console.log('success');
            }
            catch (err) {
                console.log('failure');
            }

            // TODO: Add date of last payment in field
            // TODO: Add date of last sync
        }
        else {
            report.missingInZetkin.push(customerId);
        }
    };

    console.log('Found: ', report.foundInZetkin.length);
    console.log('Missing: ', report.missingInZetkin.length);
    console.log('Unpaid: ', Object.values(report.zetkinChecklist).filter(found => !found).length);
})();
