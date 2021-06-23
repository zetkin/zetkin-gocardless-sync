const VALID_AMOUNTS = [
    600,
    800,
    1000,
];

module.exports = {
    isMembershipPayment(payment) {
        if (!payment.description) {
            return false;
        }

        const desc = payment.description.toLowerCase();

        if (desc.includes('membership') || desc.includes('membresia') || desc == 'uvw') {
            if (VALID_AMOUNTS.includes(payment.amount)) {
                return true;
            }
        }
        else if (desc.includes('solidarity')) {
            // Ignore Solidarity Network
        }

        return false;
    },

    filterMembershipPayments(payments) {
        return payments.filter(payment => isMembershipPayment(payment));
    }
}
