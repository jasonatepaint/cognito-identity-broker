import { setGrant, getCredentialsFromGrant} from "../../../src/lib/auth/grants";
import { GRANT_CONSTANTS } from "../../../src/lib/auth/consts";
import {DataService} from "../../../src/lib/data";
import {ttlFromMinutes, dayjs} from "../../../src/lib/utils/dayjs";
import {generateChallenge, generateRandom} from "../../../src/lib/cognito/utils";
import { encryptToken, decryptToken } from "../../../src/lib/utils/crypto";
import {CodeGrant} from "../../../src/lib/models/codeGrant";
import {oAuthTokenCollection} from "../../../src/lib/models/login";

jest.mock("../../../src/lib/utils/crypto");

const mockEncryptToken = encryptToken as jest.Mock;
const mockDecryptToken = decryptToken as jest.Mock;

const dataService = new DataService();
const clientId = "123456";
const redirectUri = "https://domain.com";
let credentials: oAuthTokenCollection;
let codeVerifier: string, codeChallenge: string;
let encryptedAccessToken: string, encryptedIdToken: string, encryptedRefreshToken: string;

beforeEach(() => {
	process.env.KMS_COGNITO_ALIAS = "alias/cognito-alias";
	credentials = {
		idToken: "idToken",
		accessToken: "accessToken",
		refreshToken: "refreshToken",
		expiresIn: 3600,
		tokenType: "Bearer"
	};

	encryptedAccessToken = "xxxxxxxxxxxxx";
	encryptedIdToken = "yyyyyyyyyyyyyy";
	encryptedRefreshToken = "zzzzzzzzzzzzzzzz";

	jest.clearAllTimers();

	mockEncryptToken.mockResolvedValueOnce(encryptedAccessToken);
	mockEncryptToken.mockResolvedValueOnce(encryptedIdToken);
	mockEncryptToken.mockResolvedValueOnce(encryptedRefreshToken);

	mockDecryptToken.mockResolvedValueOnce(credentials.accessToken);
	mockDecryptToken.mockResolvedValueOnce(credentials.idToken);
	mockDecryptToken.mockResolvedValueOnce(credentials.refreshToken);

	codeVerifier = generateRandom(128);
	codeChallenge = generateChallenge(codeVerifier);
});

describe('Set Grant', () => {

	test('as expected', async () => {
		const grant = await setGrant(clientId, redirectUri, codeChallenge, credentials);
		const dbGrant = <CodeGrant>await dataService.getGrant(grant.code);
		expect(dbGrant.clientId).toEqual(clientId);
		expect(dbGrant.redirectUri).toEqual(redirectUri);
		expect(dbGrant.codeChallenge).toEqual(codeChallenge);
		expect(dbGrant.ttl).toEqual(ttlFromMinutes(GRANT_CONSTANTS.TTL_MINUTES));
		expect(dbGrant.accessToken).toEqual(encryptedAccessToken);
		expect(dbGrant.idToken).toEqual(encryptedIdToken);
		expect(dbGrant.refreshToken).toEqual(encryptedRefreshToken);
		expect(dbGrant.expiresIn).toEqual(credentials.expiresIn);
		expect(dbGrant.tokenType).toEqual(credentials.tokenType);

		expect(encryptToken).toHaveBeenCalledTimes(3);
		expect(encryptToken).toHaveBeenCalledWith(credentials.accessToken);
		expect(encryptToken).toHaveBeenCalledWith(credentials.idToken);
		expect(encryptToken).toHaveBeenCalledWith(credentials.refreshToken);
	});

	test('missing attributes', async () => {
		await expect(setGrant(<any>undefined, redirectUri, codeChallenge, credentials)).rejects.toThrowError();
		await expect(setGrant(clientId, <any>undefined, codeChallenge, credentials)).rejects.toThrowError();
		await expect(setGrant(clientId, redirectUri, codeChallenge, <any>undefined)).rejects.toThrowError();
	});
});

describe('Get Credentials from Grant', () => {
	let grant, code;
	beforeEach(async function () {
		grant = await setGrant(clientId, redirectUri, codeChallenge, credentials);
		code = grant.code;
	});

	test('as expected', async () => {
		const actual = await getCredentialsFromGrant(code, clientId, redirectUri, codeVerifier);
		expect(actual).toEqual(credentials);

		expect(decryptToken).toHaveBeenCalledTimes(3);
		expect(decryptToken).toHaveBeenCalledWith(encryptedAccessToken);
		expect(decryptToken).toHaveBeenCalledWith(encryptedIdToken);
		expect(decryptToken).toHaveBeenCalledWith(encryptedRefreshToken);

		//if we ask again, it will have already been exchanged and should not exist
		const dbGrant = await dataService.getGrant(grant.code);
		expect(dbGrant).toBeUndefined();
	});

	test('not found by code', async () => {
		await expect(getCredentialsFromGrant("invalid-code", clientId, redirectUri, codeVerifier)).rejects.toThrowError();
	});

	test('missing code', async () => {
		await expect(getCredentialsFromGrant(<any>undefined, clientId, redirectUri, codeVerifier)).rejects.toThrowError();
	});

	test('expired code', async () => {
		//fake time in the future
		const dt = new Date(dayjs.utc().add(GRANT_CONSTANTS.TTL_MINUTES, "minute").toDate());
		jest.useFakeTimers()
			.setSystemTime(dt.getTime());

		await expect(getCredentialsFromGrant(code, clientId, redirectUri, codeVerifier)).rejects.toThrowError();

		//if we ask again, it should not exist as we remove expired
		const dbGrant = await dataService.getGrant(grant.code);
		expect(dbGrant).toBeUndefined();
	});

	test('clientType mismatch', async () => {
		await expect(getCredentialsFromGrant(code, "other-client", redirectUri, codeVerifier)).rejects.toThrowError();
	});

	test('redirectUri mismatch', async () => {
		await expect(getCredentialsFromGrant(code, clientId, "https://other.domain.net", codeVerifier)).rejects.toThrowError();
	});

	test('codeVerifier failure', async () => {
		await expect(getCredentialsFromGrant(code, clientId, redirectUri, generateRandom(128))).rejects.toThrowError();
		await expect(getCredentialsFromGrant(code, clientId, redirectUri, undefined)).rejects.toThrowError();
		await expect(getCredentialsFromGrant(code, clientId, redirectUri, "invalid")).rejects.toThrowError();
	});

	test('decrypt failure', async () => {
		mockDecryptToken.mockReset();
		mockDecryptToken.mockRejectedValue(new Error());

		await expect(getCredentialsFromGrant(code, clientId, redirectUri, codeVerifier)).rejects.toThrowError();

		//if we ask again, it should not exist as it was a decrypt failure
		const dbGrant = await dataService.getGrant(grant.code);
		expect(dbGrant).toBeUndefined();
	});
});
