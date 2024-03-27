import {
	generateState,
	generateChallenge,
	generateRandom } from "../../../src/lib/cognito/utils";
import qs from "querystring";

describe('Oauth Utils', () => {
	test('generates challenge from code', async () => {
		const code = "myCode";
		const expected = "UpJgL3UGWXSFKoblqiBZajG4PipVZvSSAal5Yd1pwX4";
		const x = generateChallenge(code);
		expect(x).toEqual(expected);
	});

	test('generates random string', async () => {
		const x = generateRandom(8);
		const y = generateRandom(8);
		expect(x).not.toEqual(y);
	});

	test('debug - create Code Challenge QS', async () => {
		const state = generateState(32);
		const pkce_key = generateRandom(128);
		const codeChallenge = generateChallenge(pkce_key);

		console.log(qs.stringify({
			state,
			codeChallenge
		}));
		console.log("codeVerifier", pkce_key);
	});
});
