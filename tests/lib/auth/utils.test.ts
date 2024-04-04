import { AuthConstants } from "../../../src/lib/auth";
import {
    buildLoginResponse,
    insertStateIfAny,
} from "../../../src/lib/auth/utils";

describe("Authentication Utils", () => {
    test("Build Login Response", async () => {
        const success = true;
        const result = AuthConstants.LoginResults.LoggedIn;
        const metaData = { some: "data" };
        expect(buildLoginResponse(success, result, metaData)).toEqual({
            success,
            result,
            ...metaData,
        });
    });

    test("insert state if any", async () => {
        expect(insertStateIfAny(<any>null)).toEqual("");
        expect(insertStateIfAny(undefined)).toEqual("");

        const state = "123124323423";
        expect(insertStateIfAny(state)).toEqual("&state=" + state);
    });
});
