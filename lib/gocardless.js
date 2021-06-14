const constants = require('gocardless-nodejs/constants');
const gocardless = require('gocardless-nodejs');

let client;

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

module.exports = {
    initClient(config) {
        client = gocardless(config.GOCARDLESS_KEY, constants.Environments.live);
    },

    async loadPayments(filters) {
        return loadAll(client.payments, filters);
    }
};