import {
	CognitoClient,
} from "../../../src/lib/cognito";
import { formatTokenResponse } from "../../../src/lib/cognito/utils";
import {AuthService} from "../../../src/lib/auth/authService";
import {DescribeUserPoolClientCommand, UserLambdaValidationException} from "@aws-sdk/client-cognito-identity-provider";
import {setGrant, getCredentialsFromGrant} from "../../../src/lib/auth/grants";
import jwt_decode from "jwt-decode";
import {
	buildFailedOAuth2AuthorizeResponse,
} from "../../../src/lib/auth/utils";
import {CodeFlowResponse} from "../../../src/lib/models/login";
import {AuthConstants} from "../../../src/lib/auth";

jest.mock("../../../src/lib/auth/grants");
jest.mock("../../../src/lib/cognito/cognitoClient");
jest.mock("jwt-decode");

const mockJwtDecode = jwt_decode as jest.Mock;
const mockSetGrant = setGrant as jest.Mock;
const mockGetCredentialsFromGrant = getCredentialsFromGrant as jest.Mock;
const mockCognitoClient = CognitoClient as jest.Mock;

let svc: AuthService;
const clientId = "1233456";
const redirectUrl = "http://localhost:3001";
let parameters;
let username: string;
let code: string;

const successfulLoginResult = {
	AuthenticationResult: {
		accessToken: "accessToken",
		idToken: "idToken",
		refreshToken: "refreshToken",
		expiresIn: 3600,
		tokenType: "Bearer"
	}
};

beforeEach(async () => {
	jest.clearAllMocks();

	username = "email@email.com";

	mockJwtDecode.mockReturnValue({
		username,
		client_id: clientId
	});

	code = "123456";
	mockSetGrant.mockResolvedValue({
		code
	});

	mockCognitoClient.prototype.verifyClient.mockResolvedValue(<any>{
		valid: true
	});

	svc = new AuthService();
});

describe('Authorize Client', () => {

	let state, redirectUri, accessToken, codeChallenge;
	beforeEach(() => {
		state = "thisIsMyState";
		redirectUri = "https://redirect.com";
		accessToken = "current-access-token";
		codeChallenge = "lhsdfjhsdflsdfsd";

		parameters = {
			clientId,
			redirectUri,
			state,
			codeChallenge,
			cookies: {
				accessToken,
				idToken: "current-id-token",
				refreshToken: "current-refresh-token"
			}
		};

		mockCognitoClient.prototype.initiateCustomAuth.mockResolvedValue(successfulLoginResult);
	});

	test("as expected", async () => {
		const r = <CodeFlowResponse> await svc.authorizeClient(parameters);
		expect(r.success).toBeTruthy();
		expect(r.code).toEqual(code);
		expect(r.state).toEqual(state);
		expect(r.redirectUri).toEqual(`${redirectUri}?code=${code}&state=${state}`);
		expect(r.result).toEqual(AuthConstants.LoginResults.CodeFlowInitiated);

		//jwt_decode called
		expect(jwt_decode).toHaveBeenCalledTimes(1);
		expect(jwt_decode).toHaveBeenCalledWith(accessToken);

		//initiate custom auth called
		expect(CognitoClient.prototype.initiateCustomAuth).toHaveBeenCalledTimes(1);
		expect(CognitoClient.prototype.initiateCustomAuth).toHaveBeenCalledWith(clientId, username, accessToken);

		//set grant called
		expect(setGrant).toHaveBeenCalledTimes(1);
		expect(setGrant).toHaveBeenCalledWith(clientId, redirectUri, codeChallenge,
			formatTokenResponse(successfulLoginResult.AuthenticationResult));
	});

	test('missing clientId', async () => {
		delete parameters.clientId;
		const r = await svc.authorizeClient(parameters);
		expect(r.success).toBeFalsy();
		const expected = buildFailedOAuth2AuthorizeResponse("Required parameters are missing", parameters.clientId, parameters.redirectUri, parameters.state);
		expect(r.redirectUri).toEqual(expected.redirectUri)
	});

	test('missing redirectUri', async () => {
		delete parameters.redirectUri;
		const r = await svc.authorizeClient(parameters);
		expect(r.success).toBeFalsy();
		const expected = buildFailedOAuth2AuthorizeResponse("Required parameters are missing", parameters.clientId, parameters.redirectUri, parameters.state);
		expect(r.redirectUri).toEqual(expected.redirectUri)
	});

	test('missing tokens in cookies', async () => {
		delete parameters.cookies.accessToken;
		const r = await svc.authorizeClient(parameters);
		expect(r.success).toBeFalsy();
		const expected = buildFailedOAuth2AuthorizeResponse("Missing Tokens", parameters.clientId, parameters.redirectUri, parameters.state);
		expect(r.redirectUri).toEqual(expected.redirectUri)
	});


	test('invalid client', async () => {
		const message = "Invalid RedirectURI";
		mockCognitoClient.prototype.verifyClient.mockResolvedValue({ valid: false, message });
		const r = await svc.authorizeClient(parameters);
		expect(r.success).toBeFalsy();
		const expected = buildFailedOAuth2AuthorizeResponse(message, parameters.clientId, parameters.redirectUri, parameters.state);
		expect(r.redirectUri).toEqual(expected.redirectUri)
	});

	test('initiate custom auth error', async () => {
		mockCognitoClient.prototype.initiateCustomAuth.mockRejectedValue(new Error());
		const r = await svc.authorizeClient(parameters);
		expect(r.success).toBeFalsy();
		const expectedMessage =  "Failed to authorize for client: " + clientId;
		const expected = buildFailedOAuth2AuthorizeResponse(expectedMessage, parameters.clientId, parameters.redirectUri, parameters.state);
		expect(r.redirectUri).toEqual(expected.redirectUri)
	});

	test('initiate custom auth - UserLambdaValidationException', async () => {
		const error = new UserLambdaValidationException(<any>{ message:"Access Token as expired" });
		mockCognitoClient.prototype.initiateCustomAuth.mockRejectedValue(error);

		const r = await svc.authorizeClient(parameters);
		expect(r.success).toBeFalsy();
		const expected = buildFailedOAuth2AuthorizeResponse(error.message, parameters.clientId, parameters.redirectUri, parameters.state);
		expect(r.redirectUri).toEqual(expected.redirectUri)
	});

	test('set grant error', async () => {
		mockSetGrant.mockRejectedValue(new Error());
		const r = await svc.authorizeClient(parameters);
		expect(r.success).toBeFalsy();
		const expectedMessage =  "Failed to authorize for client: " + clientId;
		const expected = buildFailedOAuth2AuthorizeResponse(expectedMessage, parameters.clientId, parameters.redirectUri, parameters.state);
		expect(r.redirectUri).toEqual(expected.redirectUri)
	});
});

describe('Get Tokens for Client', () => {

	beforeEach(() => {
		parameters = {
			clientId,
			grantType: AuthConstants.ClientGrantTypes.Code,
			redirectUri: "https://domain.com",
			code: "109156be-c4fb-41ea-b1b4-efe1671c5836",
			codeVerifier: "xxxxxx"
		};
		mockGetCredentialsFromGrant.mockResolvedValue(successfulLoginResult.AuthenticationResult);
		mockCognitoClient.prototype.refreshToken.mockResolvedValue(successfulLoginResult);
	});

	test('Authorization Code Grant Type - as expected', async () => {
		const r = await svc.getTokensForClient(parameters);
		expect(r.success).toBeTruthy();
		expect(r.authentication).toEqual(successfulLoginResult.AuthenticationResult);
		expect(r.result).toEqual(AuthConstants.LoginResults.LoggedIn);

		//Cognito client called
		const { code, redirectUri, codeVerifier } = parameters;
		expect(getCredentialsFromGrant).toHaveBeenCalledTimes(1);
		expect(getCredentialsFromGrant).toHaveBeenCalledWith(code, clientId, redirectUri, codeVerifier);

		//refreshToken not called
		expect(CognitoClient.prototype.refreshToken).toHaveBeenCalledTimes(0);
	});

	test('Refresh Token Grant Type - as expected', async () => {
		parameters = {
			clientId,
			grantType: AuthConstants.ClientGrantTypes.Refresh,
			refreshToken: "zzzzzzzzz"
		};

		const r = await svc.getTokensForClient(parameters);
		expect(r.success).toBeTruthy();
		expect(r.authentication).toEqual(formatTokenResponse(successfulLoginResult.AuthenticationResult));
		expect(r.result).toEqual(AuthConstants.LoginResults.Refreshed);

		//refreshToken called
		expect(CognitoClient.prototype.refreshToken).toHaveBeenCalledTimes(1);
		expect(CognitoClient.prototype.refreshToken).toHaveBeenCalledWith(clientId, parameters.refreshToken);

		//getCredentialsFromGrant not called
		expect(getCredentialsFromGrant).toHaveBeenCalledTimes(0);
	});

	test('handles exception', async () => {
		//as code
		mockGetCredentialsFromGrant.mockRejectedValue(new Error());
		await expect(svc.getTokensForClient(parameters)).rejects.toThrowError();

		//as refresh
		const error = new Error("nope!");
		mockCognitoClient.prototype.refreshToken.mockRejectedValue(error);
		parameters = {
			clientId: clientId,
			grantType: AuthConstants.ClientGrantTypes.Refresh,
			refreshToken: "zzzzzzzzz"
		};
		await expect(svc.getTokensForClient(parameters)).rejects.toThrowError();
	});

	test('invalid grantType', async () => {
		parameters.grantType = "invalid_type";
		await expect(svc.getTokensForClient(parameters)).rejects.toThrowError();
	});
});

describe('Login User', () => {

	let loginParameters;
	let password;
	beforeEach(async () => {
		password = "password1";
		loginParameters = { username, password };
	});

	test("password - as expected", async () => {
		mockCognitoClient.prototype.userLogin.mockResolvedValue(successfulLoginResult);

		const r = await svc.login(clientId, loginParameters);
		expect(r.success).toBeTruthy();
		expect(r.authentication).toEqual(formatTokenResponse(successfulLoginResult.AuthenticationResult));
		expect(r.result).toEqual(AuthConstants.LoginResults.LoggedIn);

		//Cognito client called
		expect(CognitoClient.prototype.userLogin).toHaveBeenCalledTimes(1);
		expect(CognitoClient.prototype.userLogin).toHaveBeenCalledWith(clientId, username, password);
	});

	test("missing username", async () => {
		delete loginParameters.username;
		await expect(svc.login(clientId, loginParameters)).rejects.toThrowError();
		expect(CognitoClient.prototype.userLogin).toHaveBeenCalledTimes(0);
	});

	test("missing password", async () => {
		delete loginParameters.password;
		await expect(svc.login(clientId, loginParameters)).rejects.toThrowError();
		expect(CognitoClient.prototype.userLogin).toHaveBeenCalledTimes(0);
	});

	test("handles cognito login failure", async () => {
		const error = new Error("nope!");
		mockCognitoClient.prototype.userLogin.mockRejectedValue(error);

		await expect(svc.login(clientId, loginParameters)).rejects.toThrowError();

		//Cognito client called
		expect(CognitoClient.prototype.userLogin).toHaveBeenCalledTimes(1);
	});

	test('Unsupported Challenge', async () => {
		const cognitoLoginResult = {
			Session: "1234",
			ChallengeName: "UNSUPPORTED_CHALLENGE"
		}
		mockCognitoClient.prototype.userLogin.mockResolvedValue(cognitoLoginResult);
		await expect(svc.login(clientId, loginParameters)).rejects.toThrowError();
	});
});

describe("Refresh Token", () => {
	beforeEach(() => {
		mockCognitoClient.prototype.refreshToken.mockResolvedValue(successfulLoginResult);
	});

	test('as expected', async () => {
		const r = await svc.refreshToken(clientId, "refreshToken");
		expect(r.success).toBeTruthy();
		expect(r.authentication).toEqual(successfulLoginResult.AuthenticationResult);

		//Cognito Client called
		expect(CognitoClient.prototype.refreshToken).toHaveBeenCalledTimes(1)
		expect(CognitoClient.prototype.refreshToken).toHaveBeenCalledWith(clientId, "refreshToken");
	});

	test('missing refresh token', async () => {
		await expect(svc.refreshToken(clientId)).rejects.toThrowError();
	});
});

describe('Verify Auth Challenge', () => {
	let cognitoUser, username, accessToken;
	beforeEach(async () => {
		accessToken = "xxxxyyyy";
		username = "123-123-123-123";
		cognitoUser = {
			Username: username
		};
		mockCognitoClient.prototype.getUserFromToken.mockResolvedValue(cognitoUser);
	});

	test('as expected', async () => {
		const valid = await svc.verifyAuthChallenge(username, accessToken);
		expect(valid).toBeTruthy();

		expect(CognitoClient.prototype.getUserFromToken).toHaveBeenCalledTimes(1);
		expect(CognitoClient.prototype.getUserFromToken).toHaveBeenCalledWith(accessToken);
	});

	test('username mismatch', async () => {
		cognitoUser.Username = "other-user-name";
		mockCognitoClient.prototype.getUserFromToken.mockResolvedValue(cognitoUser);

		const valid = await svc.verifyAuthChallenge(username, accessToken);
		expect(valid).toBeFalsy();

		expect(CognitoClient.prototype.getUserFromToken).toHaveBeenCalledTimes(1);
		expect(CognitoClient.prototype.getUserFromToken).toHaveBeenCalledWith(accessToken);
	});

	test('handles exception', async () => {
		mockCognitoClient.prototype.getUserFromToken.mockRejectedValue(new Error());

		const valid = await svc.verifyAuthChallenge(username, accessToken);
		expect(valid).toBeFalsy();

		expect(CognitoClient.prototype.getUserFromToken).toHaveBeenCalledTimes(1);
		expect(CognitoClient.prototype.getUserFromToken).toHaveBeenCalledWith(accessToken);
	});
});
