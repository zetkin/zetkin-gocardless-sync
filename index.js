const yargs = require("yargs");

const config = require("./config.json");
const { initZetkin } = require("./lib/zetkin");
const gocardless = require("./lib/gocardless");
const syncUtil = require("./lib/syncUtil");

(async () => {
    const args = yargs
        .option("gocardless", {
            alias: "g",
            description: "Sync N months from gocardless data",
            type: "number",
        })
        .option("status", {
            alias: "s",
            description: "Sync payment status from monthly tags",
            type: "boolean",
        })
        .option("numbers", {
            alias: "n",
            description: "Sync membership numbers",
            type: "boolean",
        });

    const argv = await args.argv;
    const preloadPeople = !!argv.gocardless || !!argv.numbers;
    const preloadPayments = !!argv.gocardless;

    if (!argv.gocardless && !argv.numbers && !argv.status) {
        args.showHelp();
        return;
    }

    gocardless.initClient(config);

    const z = await initZetkin(config);
    const syncer = await syncUtil.init(gocardless, z, config, {
        preloadPayments,
        preloadPeople,
    });
    const reports = [];

    if (argv.gocardless) {
        let diff = argv.gocardless;

        while (diff-- > 0) {
            const date = new Date();
            date.setMonth(date.getMonth() - diff);

            reports.push(
                await syncer.syncMonth(date.getFullYear(), date.getMonth())
            );
        }
    }

    if (argv.numbers) {
        await syncer.syncNumbers();
    }

    if (argv.status) {
        await syncer.trafficLights();
    }

    console.log("reports:");
    reports.forEach((report) => {
        console.log("  - date: ", report.date);
        console.log("    duration: ", report.duration);
        console.log("    found: ", report.foundInZetkin.length);
        console.log("    missing: ", report.missingInZetkin.length);
        console.log("    ignored: ", report.ignored.length);
        console.log(
            "    unpaid: ",
            Object.values(report.zetkinChecklist).filter((found) => !found)
                .length
        );
        console.log("    errors: ", report.errors.length);
    });
})();
