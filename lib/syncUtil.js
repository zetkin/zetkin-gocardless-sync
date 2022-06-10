const {
    getStatusActions,
    isMembershipPayment,
    monthTagName,
} = require("./utils");

const VALID_STATUS = ["confirmed", "paid_out"];

const MONTHS = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
];

module.exports = {
    async init(
        gc,
        z,
        config,
        { preloadPayments = false, preloadPeople = false }
    ) {
        console.log("preparations:");

        let mandates = [];
        let people = [];

        if (preloadPayments) {
            mandates = await gc.loadMandates();
        }

        console.log(
            ` - Pre-loaded ${mandates.length} mandates from GoCardless`
        );

        if (preloadPeople) {
            const peopleRes = await z
                .resource("orgs", config.ZETKIN_ORG_ID, "people")
                .get();
            people = peopleRes.data.data;
        }

        console.log(
            ` - Pre-loaded ${people.length} member records from Zetkin`
        );

        const tagRes = await z
            .resource("orgs", config.ZETKIN_ORG_ID, "people", "tags")
            .get();
        const tags = tagRes.data.data;

        async function getTag(tagTitle) {
            const existingTag = tags.find((t) => t.title == tagTitle);
            if (existingTag) {
                console.log(`   - Using existing tag ${existingTag.id}`);
                return existingTag;
            }

            const tagRes = await z
                .resource("orgs", config.ZETKIN_ORG_ID, "people", "tags")
                .post({
                    title: tagTitle,
                    description:
                        "Automatically synced. Do not rename or remove!",
                });

            console.log(`   - Created tag ${tagRes.data.data.id}`);

            return tagRes.data.data;
        }

        return {
            async trafficLights() {
                // Algorithm:
                // People who are already RED, just ignore
                // - This is done by excluding them from the search completely
                // People who have paid 3/3 last months (or since join date), set "Live"
                // People who haven't paid 1/3 last months, set "In arrears"
                // People who haven't paid 2/3 last months, set "Lapsed"
                // People who haven't paid at all, set "L"

                console.log("trafficlights:");
                console.log("  presync:");

                const lapsedTag = await getTag("Lapsed");
                const arrearsTag = await getTag("In arrears");
                const liveTag = await getTag("Paid up");

                const now = new Date();
                const lastThreeTags = await Promise.all(
                    [3, 2, 1].map((delta) => {
                        const then = new Date(now);
                        then.setMonth(now.getMonth() - delta);
                        const tagTitle = monthTagName(
                            then.getFullYear(),
                            then.getMonth()
                        );
                        return getTag(tagTitle);
                    })
                );

                const syncViewRes = await z
                    .resource("orgs", config.ZETKIN_ORG_ID, "people/views")
                    .post({
                        title: "Sync view (can delete after 24 hours)",
                    });
                const syncView = syncViewRes.data.data;

                // Set up Smart Search
                await z
                    .resource(
                        "orgs",
                        config.ZETKIN_ORG_ID,
                        "people/views",
                        syncView.id,
                        "content_query"
                    )
                    .patch({
                        filter_spec: [
                            // Start with people who have ever paid
                            {
                                config: {
                                    after: "2010-01-01",
                                    field: "last_paid",
                                },
                                op: "add",
                                type: "person_field",
                            },
                            // Remove lapsed
                            {
                                config: {
                                    condition: "all",
                                    tags: [lapsedTag.id],
                                },
                                op: "sub",
                                type: "person_tags",
                            },
                        ],
                    });

                // Add columns
                async function createTagColumn(tagData) {
                    await z
                        .resource(
                            "orgs",
                            config.ZETKIN_ORG_ID,
                            "people/views",
                            syncView.id,
                            "columns"
                        )
                        .post({
                            title: tagData.title,
                            type: "person_tag",
                            config: {
                                tag_id: tagData.id,
                            },
                        });
                }

                await z
                    .resource(
                        "orgs",
                        config.ZETKIN_ORG_ID,
                        "people/views",
                        syncView.id,
                        "columns"
                    )
                    .post({
                        title: "Join date",
                        type: "person_field",
                        config: { field: "join_date" },
                    });

                await z
                    .resource(
                        "orgs",
                        config.ZETKIN_ORG_ID,
                        "people/views",
                        syncView.id,
                        "columns"
                    )
                    .post({
                        title: "Last sync",
                        type: "person_field",
                        config: { field: "last_synced" },
                    });

                await createTagColumn(arrearsTag);
                await createTagColumn(liveTag);
                for (const tagData of lastThreeTags) {
                    await createTagColumn(tagData);
                }

                const rowsRes = await z
                    .resource(
                        "orgs",
                        config.ZETKIN_ORG_ID,
                        "people/views",
                        syncView.id,
                        "rows"
                    )
                    .get();

                // Delete the view
                await z
                    .resource(
                        "orgs",
                        config.ZETKIN_ORG_ID,
                        "people/views",
                        syncView.id
                    )
                    .del();

                console.log("  sync:");

                async function assignTag(personId, tag) {
                    await z
                        .resource(
                            "orgs",
                            config.ZETKIN_ORG_ID,
                            "people",
                            personId,
                            "tags",
                            tag.id
                        )
                        .put();
                }

                async function unassignTag(personId, tag) {
                    await z
                        .resource(
                            "orgs",
                            config.ZETKIN_ORG_ID,
                            "people",
                            personId,
                            "tags",
                            tag.id
                        )
                        .del();
                }

                let rowNumber = 0;
                const rows = rowsRes.data.data;
                for (const row of rows) {
                    rowNumber++;

                    const joinDate = new Date(row.content[0]);
                    const lastSync = new Date(row.content[1]);
                    const wasInArrears = row.content[2];
                    const wasLive = row.content[3];
                    const numPaid = row.content
                        .slice(4)
                        .reduce((sum, didPay) => sum + (didPay ? 1 : 0), 0);

                    const membershipDuration = lastSync - joinDate;
                    const numDue = Math.min(
                        3,
                        Math.floor(
                            membershipDuration / 1000 / 60 / 60 / 24 / 30
                        )
                    );

                    info = {
                        joinDate,
                        lastSync,
                        wasInArrears,
                        wasLive,
                        numDue,
                        numPaid,
                    };

                    const progress = `${rowNumber}/${rows.length}`;
                    console.log("    - person: ", row.id);
                    console.log("      synced: ", row.content[1]);
                    console.log("      progress: ", progress);
                    console.log("      info: ", JSON.stringify(info));

                    // If never synced
                    if (!row.content[1]) {
                        continue;
                    }

                    const actions = getStatusActions(info);

                    if (actions.hasActions) {
                        console.log("      actions: ", JSON.stringify(actions));
                    }

                    if (actions.removeInArrears) {
                        await unassignTag(row.id, arrearsTag);
                    }
                    if (actions.removeLive) {
                        await unassignTag(row.id, liveTag);
                    }
                    if (actions.setInArrears) {
                        await assignTag(row.id, arrearsTag);
                    }
                    if (actions.setLapsed) {
                        await assignTag(row.id, lapsedTag);
                    }
                    if (actions.setLive) {
                        await assignTag(row.id, liveTag);
                    }
                }
            },
            async syncNumbers() {
                let maxNumber = 1000;
                const toBeNumbered = [];
                people.forEach((p) => {
                    const extId = p.ext_id || "";
                    const prefix = extId.slice(0, 3);
                    const n = parseInt(extId.slice(3));
                    if (prefix != "UVW" || isNaN(n)) {
                        toBeNumbered.push(p);
                    } else {
                        maxNumber = Math.max(n, maxNumber);
                    }
                });

                // Sort by join date, or ID if join date is missing
                const sorted = toBeNumbered.sort((p0, p1) =>
                    p0.join_date || p1.join_date
                        ? new Date(p0.join_date) - new Date(p1.join_date)
                        : p0.id - p1.id
                );

                let nextNumber = maxNumber + 1;

                console.log("numbering:");
                console.log(`  found: ${toBeNumbered.length}`);
                console.log(`  start: ${nextNumber}`);

                for (const person of sorted) {
                    person.ext_id =
                        "UVW" + nextNumber.toString().padStart(6, "0");

                    console.log(
                        [
                            person.ext_id,
                            person.join_date,
                            person.first_name,
                            person.last_name,
                            `https://organize.zetk.in/people/person:${person.id}`,
                        ].join("\t")
                    );

                    await z
                        .resource(
                            "orgs",
                            config.ZETKIN_ORG_ID,
                            "people",
                            person.id
                        )
                        .patch({ ext_id: person.ext_id });

                    nextNumber++;
                }

                console.log("  status: done");
            },
            async syncMonth(year, month) {
                const syncDate = new Date();
                const tagTitle = monthTagName(year, month);

                console.log(`${MONTHS[month]}_${year}:`);
                console.log("  presync:");

                const tag = await getTag(tagTitle);

                console.log(`   - Loading payments for ${tagTitle}`);
                const payments = await gc.loadPaymentsForMonth(year, month);
                console.log(`   - Loaded ${payments.length} payments`);

                // TODO: Add timestamps
                const report = {
                    date: syncDate,
                    errors: [],
                    ignored: [],
                    foundInZetkin: [],
                    missingInZetkin: [],
                    zetkinChecklist: people
                        .map((p) => p.gocardless_id)
                        .filter((id) => !!id)
                        .reduce((checklist, id) => {
                            checklist[id] = false;
                            return checklist;
                        }, {}),
                };

                console.log("  sync:");
                let paymentIndex = 0;
                for (const payment of payments) {
                    const mandate = mandates.find(
                        (m) => m.id == payment.links.mandate
                    );
                    const customerId = mandate.links.customer;

                    paymentIndex++;

                    console.error(
                        `${paymentIndex}/${payments.length} (${payment.id})`
                    );
                    console.log(`    - id: ${payment.id}`);
                    console.log(
                        `      seq: ${paymentIndex}/${payments.length}`
                    );

                    if (!isMembershipPayment(payment)) {
                        console.log("      result: skipped");
                        console.log("      info:");
                        console.log("        reason: unrelated");
                        console.log(`        desc: ${payment.description}`);
                        console.log(`        amount: ${payment.amount}`);
                        report.ignored.push(payment);
                        continue;
                    }

                    if (!VALID_STATUS.includes(payment.status)) {
                        console.log("      result: skipped");
                        console.log("      info:");
                        console.log("        reason: status");
                        console.log(`        status: ${payment.status}`);
                        report.ignored.push(payment);
                        continue;
                    }

                    const person = people.find(
                        (p) => p.gocardless_id == customerId
                    );
                    if (person) {
                        report.foundInZetkin.push(person);
                        report.zetkinChecklist[customerId] = true;

                        try {
                            await z
                                .resource(
                                    "orgs",
                                    config.ZETKIN_ORG_ID,
                                    "people",
                                    person.id,
                                    "tags",
                                    tag.id
                                )
                                .put();
                            await z
                                .resource(
                                    "orgs",
                                    config.ZETKIN_ORG_ID,
                                    "people",
                                    person.id
                                )
                                .patch({
                                    last_synced: syncDate
                                        .toISOString()
                                        .slice(0, 10),
                                    last_paid: payment.charge_date,
                                });
                            console.log("      result: synced");
                        } catch (err) {
                            report.errors.push({
                                context: {
                                    person,
                                    tag,
                                },
                                error: err,
                            });

                            console.log("      result: error");
                            console.log("      info: " + JSON.stringify(err));
                        }
                    } else {
                        console.log("      result: missing");
                        console.log("      info:");
                        console.log(`        customer: ${customerId}`);
                        report.missingInZetkin.push(customerId);
                    }
                }

                report.duration = new Date() - syncDate;

                return report;
            },
        };
    },
};
