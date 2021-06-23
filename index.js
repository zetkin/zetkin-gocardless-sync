const config = require('./config.json');
const { initZetkin } = require('./lib/zetkin');
const gocardless = require('./lib/gocardless');
const syncUtil = require('./lib/syncUtil');

(async () => {
    gocardless.initClient(config);

    const z = await initZetkin(config);
    const syncer = await syncUtil.init(gocardless, z, config);
    const reports = [];

    reports.push(await syncer.syncMonth(2021, 0));
    reports.push(await syncer.syncMonth(2021, 1));
    reports.push(await syncer.syncMonth(2021, 2));
    reports.push(await syncer.syncMonth(2021, 3));
    reports.push(await syncer.syncMonth(2021, 4));
    reports.push(await syncer.syncMonth(2021, 5));

    console.log('reports:');
    reports.forEach(report => {
        console.log('  - date: ', report.date);
        console.log('    duration: ', report.duration);
        console.log('    found: ', report.foundInZetkin.length);
        console.log('    missing: ', report.missingInZetkin.length);
        console.log('    ignored: ', report.ignored.length);
        console.log('    unpaid: ', Object.values(report.zetkinChecklist).filter(found => !found).length);
        console.log('    errors: ', report.errors.length);
    });
})();
