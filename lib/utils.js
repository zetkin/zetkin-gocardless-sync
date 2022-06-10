const VALID_AMOUNTS = [600, 800, 1000];

module.exports = {
    monthTagName(year, month) {
        const monthDate = new Date(Date.UTC(year, month));
        const yearLabel = monthDate.getFullYear();
        const monthLabel = monthDate.toLocaleString("en", {
            month: "short",
        });
        return `Paid: ${yearLabel}-${monthLabel}`;
    },

    isMembershipPayment(payment) {
        if (!payment.description) {
            return false;
        }

        const desc = payment.description.toLowerCase();

        if (
            desc.includes("membership") ||
            desc.includes("membresia") ||
            desc == "uvw"
        ) {
            if (VALID_AMOUNTS.includes(payment.amount)) {
                return true;
            }
        } else if (desc.includes("solidarity")) {
            // Ignore Solidarity Network
        }

        return false;
    },

    filterMembershipPayments(payments) {
        return payments.filter((payment) => isMembershipPayment(payment));
    },

    getStatusActions(info) {
        const actions = {
            hasActions: false,
            removeInArrears: false,
            removeLive: false,
            setInArrears: false,
            setLapsed: false,
            setLive: false,
        };

        if (info.numPaid < info.numDue) {
            const diff = info.numDue - info.numPaid;
            if (diff == 1) {
                actions.setInArrears = !info.wasInArrears;
                actions.removeLive = info.wasLive;
            } else {
                actions.setLapsed = true;
                actions.removeLive = info.wasLive;
                actions.removeInArrears = info.wasInArrears;
            }
        } else {
            actions.removeInArrears = info.wasInArrears;
            actions.setLive = !info.wasLive;
        }

        if (
            actions.removeInArrears ||
            actions.removeLive ||
            actions.setInArrears ||
            actions.setLapsed ||
            actions.setLive
        ) {
            actions.hasActions = true;
        }

        return actions;
    },
};
