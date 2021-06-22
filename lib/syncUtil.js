const Z = require('zetkin');

module.exports = {
    async init(gc, z, config) {
        // TODO: Load from API instead
        const mandates = require('../.cache/mandates.json');
        const people = require('../.cache/people.json');

        const tagRes = await z.resource('orgs', config.ZETKIN_ORG_ID, 'people', 'tags').get();
        const tags = tagRes.data.data;

        async function getTag(tagTitle) {
            const existingTag = tags.find(t => t.title == tagTitle);
            if (existingTag) {
                console.log('Using existing tag', existingTag);
                return existingTag;
            }

            const tagRes = await z.resource('orgs', config.ZETKIN_ORG_ID, 'people', 'tags').post({
                title: tagTitle,
                description: 'Automatically synced. Do not rename or remove!',
            });

            console.log('Created tag', tagRes.data.data);

            return tagRes.data.data;
        }

        return {
            async syncMonth(year, month) {
                const syncDate = new Date();
                const monthDate = new Date(Date.UTC(year, month));
                const yearLabel = monthDate.getFullYear();
                const monthLabel = monthDate.toLocaleString('en', { month: 'short' });
                const tagTitle = `Paid: ${yearLabel}-${monthLabel}`;

                const tag = await getTag(tagTitle);

                console.log(`Loading payments for ${monthLabel}, ${yearLabel}`);
                const payments = await gc.loadPaymentsForMonth(year, month);
                console.log(`Loaded ${payments.length} payments`);

                // TODO: Add timestamps
                const report = {
                    errors: [],
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

                console.log('Tagging');
                let paymentIndex = 0;
                for (const payment of payments) {
                    const mandate = mandates.find(m => m.id == payment.links.mandate);
                    const customerId = mandate.links.customer;

                    paymentIndex++;
                    console.log(` - ${paymentIndex}/${payments.length}`);

                    const person = people.find(p => p.gocardless_id == customerId);
                    if (person) {
                        report.foundInZetkin.push(person);
                        report.zetkinChecklist[customerId] = true;

                        try {
                            await z.resource('orgs', config.ZETKIN_ORG_ID, 'people', person.id, 'tags', tag.id).put();
                            await z.resource('orgs', config.ZETKIN_ORG_ID, 'people', person.id).patch({
                                last_synced: syncDate.toISOString().slice(0, 10),
                                last_paid: payment.charge_date,
                            });
                        }
                        catch (err) {
                            report.errors.push({
                                context: {
                                    person,
                                    tag,
                                },
                                error: err,
                            });
                        }

                        // TODO: Add date of last payment in field
                        // TODO: Add date of last sync
                    }
                    else {
                        report.missingInZetkin.push(customerId);
                    }
                }

                return report;
            },
        };
    },
};
