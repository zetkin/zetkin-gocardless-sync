const config = require('./config.json');
const { initZetkin } = require('./lib/zetkin');
const gocardless = require('./lib/gocardless');

(async () => {
    gocardless.initClient(config);

    const Z = await initZetkin(config);
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
    console.log('payments', payments.length);
})();
