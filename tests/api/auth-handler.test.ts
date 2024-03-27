import {APIGatewayProxyEvent, Context} from "aws-lambda";
import { AuthService } from "../../src/lib/auth/authService";
import {
	clientOAuth2Authorize,
	clientOAuth2Token,
	login,
	buildAuthCookiesHeader
} from "../../src/api/handlers/auth-handler";
import cookie from "cookie";
import {oAuthTokenCollection} from "../../src/lib/models/login";

jest.mock("../../src/lib/auth/authService");

const mockAuthService = AuthService as jest.Mock;

let credentials: oAuthTokenCollection, loginResponse;
let req;
let event: APIGatewayProxyEvent;
const context: Context = <Context>{
	getRemainingTimeInMillis: () => { return 250; }
}

beforeEach(function () {
	credentials = {
		accessToken: "aaaaaaaa",
		idToken: "iiiiii",
		refreshToken: "rrrrrr",
		expiresIn: 3600,
		tokenType: "Bearer"
	};
	loginResponse = {
		authentication: credentials,
		success: true
	}
});

const getCookies = (res) : any => {
	let cookies = {};
	for (const cs of (res.multiValueHeaders["Set-Cookie"] || [])) {
		const c = cookie.parse(cs);
		cookies = {
			...cookies,
			...c
		}
	}
	return cookies;
}

describe('Login', () => {
	beforeEach(() => {
		req = { clientId: "1233456", username: "user@email.com", password: "mypassword" };
		event = <APIGatewayProxyEvent>{
			pathParameters: { },
			body: JSON.stringify(req)
		};

		mockAuthService.prototype.login.mockClear();
		mockAuthService.prototype.login.mockResolvedValue(loginResponse);
	});

	test('password as expected', async () => {
		const res = await login(event, context);
		const result = JSON.parse(<string>res.body);
		expect(result.success).toBeTruthy();
		expect(result.data.success).toBeTruthy();

		//Make sure cookies are there
		let cookies = getCookies(res);
		expect(cookies.accessToken).toEqual(credentials.accessToken);
		expect(cookies.idToken).toEqual(credentials.idToken);
		expect(cookies.refreshToken).toEqual(credentials.refreshToken);

		expect(AuthService.prototype.login).toHaveBeenCalledWith(
			req.clientId,
			{ username: req.username, password: req.password }
		);
	});

	test('unsuccessful login', async () => {
		mockAuthService.prototype.login.mockResolvedValue({ success: false });
		const res = await login(event, context);
		const result = JSON.parse(<string>res.body);
		expect(result.success).toBeTruthy();
		expect(result.data.success).toBeFalsy();

		//no cookies should have been written
		let cookies = getCookies(res);
		expect(cookies.accessToken).toBeUndefined();
		expect(cookies.idToken).toBeUndefined();
		expect(cookies.refreshToken).toBeUndefined();

		expect(AuthService.prototype.login).toHaveBeenCalledWith(
			req.clientId,
			{ username: req.username, password: req.password }
		);
	});

	test('service exception', async () => {
		mockAuthService.prototype.login.mockRejectedValue(new Error());
		const res = await login(event, context);
		const result = JSON.parse(<string>res.body);
		expect(result.success).toBeFalsy();
	});
});

describe('Client Authorize', () => {
	let redirectUri;
	let redirectUriWithCode;
	beforeEach(() => {
		redirectUri = "https://domain.com";
		redirectUriWithCode = `${redirectUri}?code=123456`;
		req = { clientId: "1233456", redirectUri };
		event = <APIGatewayProxyEvent>{
			pathParameters: { },
			queryStringParameters: req,
			headers: <any>{
				Cookie: "accessToken=xxxx;"
			}
		};

		mockAuthService.prototype.authorizeClient.mockClear();
		mockAuthService.prototype.authorizeClient.mockResolvedValue({ redirectUri: redirectUriWithCode });
	});

	test('as expected', async () => {
		const res = await clientOAuth2Authorize(event, context);
		expect(res.statusCode).toEqual(302);
		expect(res.headers?.Location).toEqual(redirectUriWithCode);

		expect(AuthService.prototype.authorizeClient).toHaveBeenCalledTimes(1);
		expect(AuthService.prototype.authorizeClient).toHaveBeenCalledWith({
			...req,
			cookies: { accessToken: "xxxx"}
		});
	});

	test('service exception', async () => {
		mockAuthService.prototype.authorizeClient.mockRejectedValue(new Error());
		const res = await clientOAuth2Authorize(event, context);
		const result = JSON.parse(<string>res.body);
		expect(result.success).toBeFalsy();
	});
});

describe('Client Tokens', () => {
	beforeEach(() => {
		req = { clientId: "1233456" };
		event = <APIGatewayProxyEvent>{
			pathParameters: { },
			body: JSON.stringify(req)
		};

		mockAuthService.prototype.getTokensForClient.mockClear();
		mockAuthService.prototype.getTokensForClient.mockResolvedValue({});
	});

	test('as expected', async () => {
		const res = await clientOAuth2Token(event, context);
		const result = JSON.parse(<string>res.body);
		expect(result.success).toBeTruthy();

		expect(AuthService.prototype.getTokensForClient).toHaveBeenCalledTimes(1);
		expect(AuthService.prototype.getTokensForClient).toHaveBeenCalledWith(req);
	});

	test('service exception', async () => {
		mockAuthService.prototype.getTokensForClient.mockRejectedValue(new Error());
		const res = await clientOAuth2Token(event, context);
		const result = JSON.parse(<string>res.body);
		expect(result.success).toBeFalsy();
	});
});

describe('Build Auth Cookies Header', () => {
	let options;
	beforeEach(function () {
		process.env.COGNITO_REFRESH_TOKEN_EXPIRES_DAYS = "7";

		event = <APIGatewayProxyEvent>{
			headers: <any>{
				"Host": "https://domain.com"
			}
		}

		options = {
			maxAge: credentials.expiresIn,
			httpOnly: false,
			path: "/",
			sameSite: "strict",
			secure: true
		};
	});

	test('as expected', async () => {
		const res = buildAuthCookiesHeader(credentials, event);
		let cookies = res["Set-Cookie"];
		expect(cookies).toHaveLength(3);

		expect(cookies[0]).toEqual(cookie.serialize("accessToken", credentials.accessToken, options));
		expect(cookies[1]).toEqual(cookie.serialize("idToken", credentials.idToken, options));

		//comes from env var
		const maxAge = 60 * 60 * 24 * parseInt(process.env.COGNITO_REFRESH_TOKEN_EXPIRES_DAYS || "1");
		expect(cookies[2]).toEqual(cookie.serialize("refreshToken", credentials.refreshToken, { ...options, maxAge }));
	});

	test('refresh token environment variable missing', async () => {
		delete process.env.COGNITO_REFRESH_TOKEN_EXPIRES_DAYS;
		const res = buildAuthCookiesHeader(credentials, event);
		let cookies = res["Set-Cookie"];
		expect(cookies).toHaveLength(3);

		//defaults to 1 day
		const maxAge = 60 * 60 * 24;
		expect(cookies[2]).toEqual(cookie.serialize("refreshToken", credentials.refreshToken, { ...options, maxAge }));
	});

	test('local dev env', async () => {
		event.headers.Host = "localhost";
		options.secure = false;

		const res = buildAuthCookiesHeader(credentials, event);
		let cookies = res["Set-Cookie"];
		expect(cookies).toHaveLength(3);

		expect(cookies[0]).toEqual(cookie.serialize("accessToken", credentials.accessToken, options));
		expect(cookies[1]).toEqual(cookie.serialize("idToken", credentials.idToken, options));

		//comes from env var
		const maxAge = 60 * 60 * 24 * parseInt(process.env.COGNITO_REFRESH_TOKEN_EXPIRES_DAYS|| "1");
		expect(cookies[2]).toEqual(cookie.serialize("refreshToken", credentials.refreshToken, { ...options, maxAge }));
	});
});
