import {APIGatewayProxyEvent, Context} from "aws-lambda";
import {AuthService} from "../../lib/auth/authService";
import cookie from "cookie";
import {handleRequest, HandleRequestOptions, HttpContext} from "../../lib/http";
import {LoginParameters, oAuthTokenCollection} from "../../lib/models/login";
import {formatTokenResponse} from "../../lib/cognito/utils";

const getObjectFromRequest = (event: APIGatewayProxyEvent) => {
    try {
        return JSON.parse(<string>event.body);
    } catch (e) {
        /* istanbul ignore next */
        return {};
    }
};


export const login = async (event: APIGatewayProxyEvent, context: Context) => {
    console.log("EVENT", event);
    const ctx = new HttpContext(event, context);
    const svc = new AuthService();
    const { clientId, username, password } = getObjectFromRequest(event);
    const loginParameters: LoginParameters = { username, password };
    return handleAuthFlow(ctx, svc.login(clientId, loginParameters), event);
};

export const clientOAuth2Authorize = async (event: APIGatewayProxyEvent, context: Context) => {
    console.log("EVENT", event);
    const ctx = new HttpContext(event, context);
    const fn = async () => {
        const svc = new AuthService();
        const result = await svc.authorizeClient(<any>{
            ...event.queryStringParameters,
            cookies: cookie.parse(event.headers.cookie || event.headers.Cookie || "")
        });
        return {
            data: result,
            headers: {
                Location: result.redirectUri
            }
        };
    };
    return handleRequest(ctx, fn(), <HandleRequestOptions>{ successfulStatusCode: 302, resultHasHeaders: true });
};

export const clientOAuth2Token = async (event: APIGatewayProxyEvent, context: Context) => {
    console.log("EVENT", event);
    const parameters = getObjectFromRequest(event);
    const ctx = new HttpContext(event, context);
    const svc = new AuthService();
    return handleRequest(ctx, svc.getTokensForClient(parameters));
};

/***
 * Creates a Set-Cookie with all JWTs available in collection
 */
export const buildAuthCookiesHeader = (auth: oAuthTokenCollection, event: APIGatewayProxyEvent) => {
    const tokens = formatTokenResponse(auth);
    const isLocal = event.headers?.Host?.startsWith("localhost");
    const options = {
        maxAge: tokens.expiresIn,
        httpOnly: false,
        path: "/",
        sameSite: "strict",
        secure: !isLocal //if local, set to false (allow local testing)
    };

    const cookies: string[] = [];
    if (tokens.accessToken) {
        cookies.push(cookie.serialize("accessToken", tokens.accessToken, options));
    }
    if (tokens.idToken) {
        cookies.push(cookie.serialize("idToken", tokens.idToken, options));
    }
    if (tokens.refreshToken) {
        const expiresDays = parseInt(process.env.COGNITO_REFRESH_TOKEN_EXPIRES_DAYS || "1");
        const maxAge = 60 * 60 * 24 * expiresDays;
        cookies.push(cookie.serialize("refreshToken", tokens.refreshToken, { ...options, maxAge }));
    }
    return {
        "Set-Cookie": cookies
    };
};

const handleAuthFlow = async (ctx: HttpContext, promise: Promise<any>, event: APIGatewayProxyEvent) => {
    const fn = async () => {
        const data = await promise;
        const headers = data.success ? buildAuthCookiesHeader(data.authentication, event) : {};
        return {
            headers,
            data
        };
    };
    return handleRequest(ctx, fn(), <HandleRequestOptions>{ resultHasHeaders: true });
};
