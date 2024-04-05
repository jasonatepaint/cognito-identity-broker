import { UserLambdaValidationException } from "@aws-sdk/client-cognito-identity-provider";
import { setGrant, getCredentialsFromGrant } from "./grants";
import jwt_decode from "jwt-decode";
import {
    buildLoginResponse,
    buildFailedOAuth2AuthorizeResponse,
    insertStateIfAny,
} from "./utils";
import {
    CodeFlowResponse,
    oAuth2AuthorizeParameters,
    oAuth2TokenParameters,
} from "../models/authentication";
import {
    FailedLoginResponse,
    LoginParameters,
    UserLoginResponse,
} from "../models/authentication";
import { CognitoClient } from "../cognito";
import { AuthConstants } from "./index";
import { formatTokenResponse } from "../cognito/utils";

/***
 * Handles all user-based authentication including login, password & token management
 */
export class AuthService {
    cognito: CognitoClient;

    constructor() {
        this.cognito = new CognitoClient();
    }

    /***
     * Logs a user in to the SSO Identity Broker using username/password auth flow
     */
    async login(clientId: string, parameters: LoginParameters): Promise<UserLoginResponse> {
        const { username, password } = parameters;
        if (username === undefined) {
            throw new Error("missing username");
        }
        if (password === undefined) {
            throw new Error("missing password");
        }

        const result = await this.cognito.userLogin(
            clientId,
            username,
            password,
        );
        const authentication = formatTokenResponse(result.AuthenticationResult);
        return buildLoginResponse<UserLoginResponse>(
            true,
            AuthConstants.LoginResults.LoggedIn,
            { authentication },
        );
    }

    /**
     * Initiates the code flow process, using the SSO broker's cookie credentials and returning a code which can be
     * exchanged for client credentials.
     */
    async authorizeClient(parameters: oAuth2AuthorizeParameters): Promise<CodeFlowResponse | FailedLoginResponse> {
        const {
            clientId,
            redirectUri,
            state,
            codeChallenge,
            cookies
        } = parameters;

        const failedResponse = (reason: string) => {
            return buildFailedOAuth2AuthorizeResponse(
                reason,
                clientId,
                redirectUri,
                state,
            );
        };

        if (clientId === undefined || redirectUri === undefined) {
            return failedResponse("Required parameters are missing");
        }

        const hasTokens = !!(
            cookies?.idToken &&
            cookies?.accessToken &&
            cookies?.refreshToken
        );
        if (!hasTokens) {
            return failedResponse("Missing Tokens");
        }

        const r = await this.cognito.verifyClient(clientId, redirectUri);
        if (!r.valid) {
            return failedResponse(<string>r.message);
        }

        try {
            const tokenDecoded = jwt_decode<any>(cookies.accessToken);
            const username = tokenDecoded["username"];
            const result = await this.cognito.initiateCustomAuth(
                clientId,
                username,
                cookies.accessToken,
            );
            const credentials = formatTokenResponse(
                result.AuthenticationResult,
            );
            const grant = await setGrant(
                clientId,
                redirectUri,
                credentials,
                codeChallenge,
            );
            const code = grant.code;
            return buildLoginResponse<CodeFlowResponse>(
                true,
                AuthConstants.LoginResults.CodeFlowInitiated,
                {
                    code,
                    redirectUri:
                        redirectUri + `?code=${code}${insertStateIfAny(state)}`,
                    state,
                },
            );
        } catch (e) {
            console.error(e);
            let message = `Failed to authorize for client: ${clientId}`;
            if (e instanceof UserLambdaValidationException) {
                //If we get here, the cognito trigger function is failing...
                message = e.message;
            }
            return failedResponse(message);
        }
    }

    /***
     * Exchanges a code for JWT tokens (id, access, refresh) for a client app
     */
    async getTokensForClient(parameters: oAuth2TokenParameters): Promise<UserLoginResponse> {
        const {
            clientId,
            redirectUri,
            codeVerifier,
            code,
            grantType,
            refreshToken,
        } = parameters;

        if (grantType === AuthConstants.ClientGrantTypes.Code) {
            try {
                const authentication = await getCredentialsFromGrant(
                    code,
                    clientId,
                    redirectUri,
                    codeVerifier,
                );
                return buildLoginResponse<UserLoginResponse>(
                    true,
                    AuthConstants.LoginResults.LoggedIn,
                    { authentication },
                );
            } catch (e) {
                console.error(e);
                throw new Error(`Failed to authorize for client: ${clientId}`);
            }
        } else if (grantType === AuthConstants.ClientGrantTypes.Refresh) {
            return this.refreshToken(clientId, refreshToken);
        }
        throw new Error("Invalid grantType");
    }

    /***
     * Refreshes a user's authentication using a RefreshToken
     */
    async refreshToken(
        clientId: string,
        refreshToken?: string,
    ): Promise<UserLoginResponse> {
        if (!refreshToken) {
            throw new Error("Missing Refresh Token");
        }
        const result = await this.cognito.refreshToken(clientId, refreshToken);
        const authentication = formatTokenResponse(result.AuthenticationResult);
        return buildLoginResponse<UserLoginResponse>(
            true,
            AuthConstants.LoginResults.Refreshed,
            { authentication },
        );
    }

    /**
     * Verifies a user's token against the cognito trigger's event username
     * For this call to be successful, the following must be true:
     * 1) Access Token needs to be valid and non-expired
     * 2) The token's username must match the inbound trigger's event username
     */
    async verifyAuthChallenge(username: string, accessToken: string): Promise<boolean> {
        try {
            const userInfo = await this.cognito.getUserFromToken(accessToken);
            return userInfo.Username === username;
        } catch (e) {
            console.warn(
                "Unable to verify Auth Challenge for username: " + username,
                e,
            );
        }
        return false;
    }
}
