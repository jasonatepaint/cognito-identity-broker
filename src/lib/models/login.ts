
export interface oAuth2ClientParameters {
	clientId: string;
	redirectUri?: string;
}

/**
 * @property clientType - Cognito Client App name
 * @property provider - 3rd Party SSO provider (SAML/Oidc)
 * @property redirectUri - A registered url (with the Client app) to use during browser redirect
 * @property [state] - Add this value to your requests to guard against CSRF attacks.
 * @property [codeChallenge] - The challenge that you generated from the code_verifier.
 * @property [cookies] - The Cookie Jar (parsed from the Lambda Event headers)
 */
export interface oAuth2AuthorizeParameters extends oAuth2ClientParameters {
	provider: string;
	state?: string
	codeChallenge?: string;
	cookies?: { [key: string]: string }
}

/**
 * @property clientType - Cognito Client App name used in the initial Authorize request
 * @property grantType - Must be authorization_code or refresh_token
 * @property [redirectUri] - (grantType: authorization_code) A registered url (with the Client app) used in the initial Authorize request
 * @property [code] - (grantType: authorization_code) Code that was returned from the oAuth Code flow
 * @property [codeVerifier] - (grantType: authorization_code) The proof key
 * @property [refreshToken] - (grantType: refresh_token) - A valid refresh token to create new id/access tokens
 */
export interface oAuth2TokenParameters extends oAuth2ClientParameters {
	grantType: string;
	code: string;
	codeVerifier?: string;
	refreshToken?: string;
}

export interface oAuthTokenCollection {
	accessToken: string;
	idToken: string;
	refreshToken: string;
	expiresIn: number;
	tokenType: string;
}


/**
 * @param {string} type - The type of challenge the user is responding to
 */
export interface AuthChallengeResponse {
	type: string;
}

export interface AuthChallengeResponseParameters {
	required: string[];
}

export interface AuthChallengeParameters {
	username: string;
	uid: string;
	session?: string;
}

export interface CodeFlowResponse extends LoginResponse{
	redirectUri: string;
	code: string;
	state?: string;
	sessionExpires: string;
}

export interface CodeFlowLoginResponse {
	data: CodeFlowResponse
	cookies: object[]
}

export interface oAuth2ClientParameters {
	clientType: string;
	redirectUri?: string;
}

export interface LoginParameters {
	username: string;
	password: string;
}

export interface LoginResponse {
	success: boolean;
	result: string;
}

export interface UserLoginResponse extends LoginResponse {
	authentication: oAuthTokenCollection;
}

export interface FailedLoginResponse extends LoginResponse {
	redirectUri: string;
	state: string;
	error: string;
}

export interface ChallengeLoginResponse extends LoginResponse {
	parameters: AuthChallengeResponseParameters;
	challenge: AuthChallengeParameters;
	response: AuthChallengeResponse;
}
