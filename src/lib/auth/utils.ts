import {AuthConstants} from "./index";
import {
	FailedLoginResponse,
	LoginResponse,
} from "../models/login";

export const buildLoginResponse = <T extends LoginResponse>(success: boolean, result: string, metaData = {}) : T => {
	return <T>{
		success,
		result,
		...metaData
	};
};

export const buildFailedOAuth2AuthorizeResponse = (reason, clientId, redirectUri, state) : FailedLoginResponse => {
	return <FailedLoginResponse>buildLoginResponse(false, AuthConstants.LoginResults.CodeFlowInitiated, {
		redirectUri: `?clientId=${clientId}&redirectUri=${redirectUri}${insertStateIfAny(state)}&forceAuth=true&error=${reason}`,
		state,
		error: reason
	});
};


export const insertStateIfAny = (state) => {
	let stateQueryString = "";
	if (state !== null && state !== undefined) {
		stateQueryString = "&state=" + state;
	}
	return stateQueryString;
};

