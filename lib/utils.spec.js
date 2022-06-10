const { getStatusActions } = require("./utils");
describe("utils", () => {
    describe("getStatusActions()", () => {
        describe("when member more than 3 months", () => {
            const then = new Date();
            then.setFullYear(then.getFullYear() - 1);

            const mockInfo = {
                joinDate: then,
                wasInArrears: false,
                wasLive: false,
                numDue: 3,
                numPaid: 3,
            };

            it("returns no actions for live -> live", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasLive: true,
                });
                expect(actions.hasActions).toBeFalsy();
                expect(actions.removeInArrears).toBeFalsy();
                expect(actions.removeLive).toBeFalsy();
                expect(actions.setInArrears).toBeFalsy();
                expect(actions.setLapsed).toBeFalsy();
                expect(actions.setLive).toBeFalsy();
            });

            it("returns no actions for arrears -> arrears", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasInArrears: true,
                    numPaid: 2,
                });
                expect(actions.hasActions).toBeFalsy();
                expect(actions.removeInArrears).toBeFalsy();
                expect(actions.removeLive).toBeFalsy();
                expect(actions.setInArrears).toBeFalsy();
                expect(actions.setLapsed).toBeFalsy();
                expect(actions.setLive).toBeFalsy();
            });

            it("returns setLive, removeInArrears for arrears -> live", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasInArrears: true,
                });
                expect(actions.hasActions).toBeTruthy();
                expect(actions.removeInArrears).toBeTruthy();
                expect(actions.removeLive).toBeFalsy();
                expect(actions.setInArrears).toBeFalsy();
                expect(actions.setLapsed).toBeFalsy();
                expect(actions.setLive).toBeTruthy();
            });

            it("returns removeLive, setInArrears for live -> arrears", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasLive: true,
                    numPaid: 2,
                });
                expect(actions.hasActions).toBeTruthy();
                expect(actions.removeInArrears).toBeFalsy();
                expect(actions.removeLive).toBeTruthy();
                expect(actions.setInArrears).toBeTruthy();
                expect(actions.setLapsed).toBeFalsy();
                expect(actions.setLive).toBeFalsy();
            });

            it("returns setLapsed, removeInArrears for arrears -> lapsed", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasInArrears: true,
                    numPaid: 1,
                });
                expect(actions.hasActions).toBeTruthy();
                expect(actions.removeInArrears).toBeTruthy();
                expect(actions.removeLive).toBeFalsy();
                expect(actions.setInArrears).toBeFalsy();
                expect(actions.setLapsed).toBeTruthy();
                expect(actions.setLive).toBeFalsy();
            });

            it("returns setLapsed, removeLive for live -> lapsed", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasLive: true,
                    numPaid: 1,
                });
                expect(actions.hasActions).toBeTruthy();
                expect(actions.removeInArrears).toBeFalsy();
                expect(actions.removeLive).toBeTruthy();
                expect(actions.setInArrears).toBeFalsy();
                expect(actions.setLapsed).toBeTruthy();
                expect(actions.setLive).toBeFalsy();
            });
        });

        describe("when member for 1 month", () => {
            const then = new Date();
            then.setFullYear(then.getFullYear(), then.getMonth() - 1);

            const mockInfo = {
                joinDate: then,
                wasInArrears: false,
                wasLive: false,
                numDue: 1,
                numPaid: 1,
            };

            it("returns no actions for live -> live", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasLive: true,
                });
                expect(actions.hasActions).toBeFalsy();
                expect(actions.removeInArrears).toBeFalsy();
                expect(actions.removeLive).toBeFalsy();
                expect(actions.setInArrears).toBeFalsy();
                expect(actions.setLapsed).toBeFalsy();
                expect(actions.setLive).toBeFalsy();
            });

            it("returns no actions for arrears -> arrears", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasInArrears: true,
                    numPaid: 0,
                });
                expect(actions.hasActions).toBeFalsy();
                expect(actions.removeInArrears).toBeFalsy();
                expect(actions.removeLive).toBeFalsy();
                expect(actions.setInArrears).toBeFalsy();
                expect(actions.setLapsed).toBeFalsy();
                expect(actions.setLive).toBeFalsy();
            });

            it("returns setLive, removeInArrears for arrears -> live", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasInArrears: true,
                });
                expect(actions.hasActions).toBeTruthy();
                expect(actions.removeInArrears).toBeTruthy();
                expect(actions.removeLive).toBeFalsy();
                expect(actions.setInArrears).toBeFalsy();
                expect(actions.setLapsed).toBeFalsy();
                expect(actions.setLive).toBeTruthy();
            });

            it("returns removeLive, setInArrears for live -> arrears", () => {
                const actions = getStatusActions({
                    ...mockInfo,
                    wasLive: true,
                    numPaid: 0,
                });
                expect(actions.hasActions).toBeTruthy();
                expect(actions.removeInArrears).toBeFalsy();
                expect(actions.removeLive).toBeTruthy();
                expect(actions.setInArrears).toBeTruthy();
                expect(actions.setLapsed).toBeFalsy();
                expect(actions.setLive).toBeFalsy();
            });
        });
    });
});
