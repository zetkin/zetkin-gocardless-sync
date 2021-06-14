const constants = require('gocardless-nodejs/constants');
const gocardless = require('gocardless-nodejs');

const config = require('./config.json');

const client = gocardless(config.GOCARDLESS_KEY, constants.Environments.live);

const loadAll = async (resource, filters) => {
	const loadNext = async (all = [], after = undefined) => {
	    const batch = await resource.list({
			...filters,
	        after: after,
	        limit: 500,
	    });

		// Find key that contains data, e.g. `payments`, `customers` etc
		const key = Object.keys(batch).find(k => !['meta', '__response__'].includes(k));

		// Append resources to full list
	    all = all.concat(batch[key]);

	    if (batch[key].length == batch.meta.limit) {
	        all = await loadNext(all, batch.meta.cursors.after);
	    }

	    return all;
	};

	return await loadNext();
};

(async () => {
	const payments = await loadAll(client.payments, {
	    created_at: {
	        gt: '2021-01-01T00:00:00.000Z',
	        lt: '2021-02-01T00:00:00.000Z',
	    },
	});
})();
