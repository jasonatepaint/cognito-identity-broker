import { AuthConstants } from "./consts";
import { FailedLoginResponse, LoginResponse } from "../models/authentication";

export const buildLoginResponse = <T extends LoginResponse>(
    success: boolean,
    result: string,
    metaData = {},
): T => {
    return <T>{
        success,
        result,
        ...metaData,
    };
};

export const buildFailedOAuth2AuthorizeResponse = (
    reason: string,
    clientId: string,
    redirectUri: string | undefined,
    state: string | undefined,
): FailedLoginResponse => {
    return <FailedLoginResponse>(
        buildLoginResponse(
            false,
            AuthConstants.LoginResults.CodeFlowInitiated,
            {
                redirectUri: `?clientId=${clientId}&redirectUri=${redirectUri}${insertStateIfAny(state)}&forceAuth=true&error=${reason}`,
                state,
                error: reason,
            },
        )
    );
};

export const insertStateIfAny = (state: string | undefined) => {
    let stateQueryString = "";
    if (state !== null && state !== undefined) {
        stateQueryString = "&state=" + state;
    }
    return stateQueryString;
};
