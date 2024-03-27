import {oAuthTokenCollection} from "../models/login"

export interface CodeGrant extends oAuthTokenCollection {
	code: string;
	clientId: string;
	redirectUri: string;
	codeChallenge?: string;
	dt: string;
	ttl: number;
}
