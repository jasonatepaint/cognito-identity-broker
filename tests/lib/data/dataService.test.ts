import { DataService } from "../../../src/lib/data";
import {ttlFromMinutes} from "../../../src/lib/utils/dayjs";

const svc = new DataService();

describe('Grants Data Service', () => {
	let encryptedCredentials;
	let clientId;
	let codeChallenge;
	let redirectUri;
	beforeEach(async() => {
		encryptedCredentials = {
			accessToken: "xxxxxx",
			idToken: "yyyyy",
			refreshToken: "zzzzzz",
			expiresIn: 3600,
			tokenType: "BEARER"
		};
		codeChallenge = "12345";
		clientId = "888888890";
		redirectUri = "https://domain.com";
	});

	test('set grant', async () => {
		const dateTime = new Date();
		jest.useFakeTimers()
			.setSystemTime(dateTime.getTime());

		const item = await svc.setGrant(clientId, redirectUri, codeChallenge, encryptedCredentials, 5);
		const actual = await svc.getGrant(item.code);
		expect(item).toEqual(actual);
		expect(actual?.clientId).toEqual(clientId);
		expect(actual?.redirectUri).toEqual(redirectUri);
		expect(actual?.codeChallenge).toEqual(codeChallenge);
		expect(actual?.accessToken).toEqual(encryptedCredentials.accessToken);
		expect(actual?.idToken).toEqual(encryptedCredentials.idToken);
		expect(actual?.refreshToken).toEqual(encryptedCredentials.refreshToken);
		expect(actual?.expiresIn).toEqual(encryptedCredentials.expiresIn);
		expect(actual?.tokenType).toEqual(encryptedCredentials.tokenType);
		expect(actual?.ttl).toEqual(ttlFromMinutes(5));
		expect(actual?.dt).toEqual(dateTime.toISOString());
	});

	test('not found', async () => {
		const actual = await svc.getGrant("some-code");
		expect(actual).toBeUndefined();
	});

	test('delete Grant', async () => {
		const item = await svc.setGrant(clientId, redirectUri, codeChallenge, encryptedCredentials);
		let actual = await svc.getGrant(item.code);
		expect(actual).toBeDefined();

		await svc.deleteGrant(item.code);
		actual = await svc.getGrant(item.code);
		expect(actual).toBeUndefined();
	});
});
