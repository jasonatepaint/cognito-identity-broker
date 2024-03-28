import { DataService } from "../data";
import {dayjs} from "../utils/dayjs";
import { encryptToken, decryptToken } from "../utils/crypto";
import crypto from "crypto";
import {oAuthTokenCollection} from "../models/login";
import { GRANT_CONSTANTS } from "./consts";

export const setGrant = async (clientId: string, redirectUri: string, codeChallenge: string | undefined = undefined, credentials: oAuthTokenCollection) => {
	if (!clientId || !redirectUri || !credentials) {
		throw new Error("Missing user credentials")
	}

	const dataService = new DataService();
	const accessToken = await encryptToken(credentials.accessToken);
	const idToken = await encryptToken(credentials.idToken);
	const refreshToken = await encryptToken(credentials.refreshToken);
	const encryptedCredentials = {
		...credentials,
		accessToken,
		idToken,
		refreshToken
	};
	return dataService.setGrant(clientId, redirectUri, codeChallenge, encryptedCredentials, GRANT_CONSTANTS.TTL_MINUTES);
}

/***
 * Gets stored credentials grant with an id (code)
 */
export const getCredentialsFromGrant = async (code: string, clientId: string, redirectUri: string | undefined = undefined, codeVerifier: string | undefined = undefined) => {
	const dataService = new DataService();
	if (!code || code.length === 0) {
		throw new Error("Missing authorization code");
	}
	const grant = await dataService.getGrant(code);
	if (!grant) {
		throw new Error("Invalid authorization code");
	}
	if (grant.clientId !== clientId) {
		throw new Error("Client ID does not match authorization code");
	}
	if (grant.redirectUri !== redirectUri) {
		throw new Error("Redirect uri does not match authorization code");
	}

	if (grant.codeChallenge) {
		if (!codeVerifier) {
			throw new Error("Code verifier is missing");
		}
		const calculatedCodeChallenge = base64URLEncode(sha256(codeVerifier));
		if (grant.codeChallenge !== calculatedCodeChallenge) {
			throw new Error("Code verifier does not match code challenge");
		}
	}

	let credentials: oAuthTokenCollection;
	try {
		//Our DynamoDb table is configured for a TTL. The TTL is longer than the code expiration.
		//This allows for a diagnostic period of time, where the system is aware of a grant even if it's expired
		const expiresAt = dayjs.utc(grant.dt).add(GRANT_CONSTANTS.EXPIRED_CODE_MINUTES, "minute").unix();
		if (dayjs.utc().unix() > expiresAt) {
			throw new Error("Authorization code expired");
		}

		try {
			const { expiresIn, tokenType } = grant;
			const accessToken = await decryptToken(grant.accessToken);
			const idToken = await decryptToken(grant.idToken);
			const refreshToken = await decryptToken(grant.refreshToken);
			credentials = {
				accessToken,
				idToken,
				refreshToken,
				expiresIn,
				tokenType
			};
		} catch (e) {
			throw new Error(`Invalid Grant: ${e.message}`);
		}
	} finally {
		// Clear out the grant immediately
		try {
			await dataService.deleteGrant(code);
		} catch (e) {
			/* istanbul ignore next */
			console.warn("Failed to delete grant with id: " + code);
		}
	}
	return credentials;
}

const base64URLEncode = (buffer: Uint8Array) => {
	return Buffer.from(buffer).toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

const sha256 = (str: string) : Uint8Array => {
	return crypto.createHash('sha256').update(str).digest();
}
