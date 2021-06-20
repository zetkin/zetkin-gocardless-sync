const config = require('./config.json');
const { initZetkin } = require('./lib/zetkin');
const gocardless = require('./lib/gocardless');
const syncUtil = require('./lib/syncUtil');

(async () => {
    gocardless.initClient(config);

    const z = await initZetkin(config);
    /*
    try {
        const data = await Z.resource('session').get();
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

    const syncer = await syncUtil.init(gocardless, z, config);

    report = await syncer.syncMonth(2021, 1);
    console.log('Found: ', report.foundInZetkin.length);
    console.log('Missing: ', report.missingInZetkin.length);
    console.log('Unpaid: ', Object.values(report.zetkinChecklist).filter(found => !found).length);
    console.log('Errors', report.errors);

    report = await syncer.syncMonth(2021, 2);
    console.log('Found: ', report.foundInZetkin.length);
    console.log('Missing: ', report.missingInZetkin.length);
    console.log('Unpaid: ', Object.values(report.zetkinChecklist).filter(found => !found).length);
    console.log('Errors', report.errors);

    report = await syncer.syncMonth(2021, 3);
    console.log('Found: ', report.foundInZetkin.length);
    console.log('Missing: ', report.missingInZetkin.length);
    console.log('Unpaid: ', Object.values(report.zetkinChecklist).filter(found => !found).length);
    console.log('Errors', report.errors);

    report = await syncer.syncMonth(2021, 4);
    console.log('Found: ', report.foundInZetkin.length);
    console.log('Missing: ', report.missingInZetkin.length);
    console.log('Unpaid: ', Object.values(report.zetkinChecklist).filter(found => !found).length);
    console.log('Errors', report.errors);

    report = await syncer.syncMonth(2021, 5);
    console.log('Found: ', report.foundInZetkin.length);
    console.log('Missing: ', report.missingInZetkin.length);
    console.log('Unpaid: ', Object.values(report.zetkinChecklist).filter(found => !found).length);
    console.log('Errors', report.errors);
})();
