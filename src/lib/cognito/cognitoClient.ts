import {
	CognitoIdentityProviderClient,
	AdminInitiateAuthCommand,
	AdminRespondToAuthChallengeCommand,
	AdminInitiateAuthCommandOutput,
	AdminRespondToAuthChallengeCommandInput,
	AdminRespondToAuthChallengeCommandOutput,
	DescribeUserPoolClientCommand,
	GetUserCommandOutput,
	GetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";

/**
 * Handles all low-level Cognito SDK calls
 */
export class CognitoClient {
	userPoolId: string;
	client: CognitoIdentityProviderClient;

	constructor() {
		this.userPoolId = <string>process.env.COGNITO_POOL_ID;
		this.client = new CognitoIdentityProviderClient();
	}

	async getUserFromToken(accessToken: string): Promise<GetUserCommandOutput> {
		return await this.client.send(new GetUserCommand({
			AccessToken: accessToken
		}));
	}

	async userLogin(clientId: string, username: string, password: string) : Promise<AdminInitiateAuthCommandOutput> {
		return await this.client.send(new AdminInitiateAuthCommand({
			UserPoolId: this.userPoolId,
			ClientId: clientId,
			AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
			AuthParameters: {
				USERNAME: username,
				PASSWORD: password
			}
		}));
	}

	async initiateCustomAuth(clientId: string, username: string, accessToken: string) : Promise<AdminInitiateAuthCommandOutput> {
		const result = await this.client.send(new AdminInitiateAuthCommand({
			ClientId: clientId,
			UserPoolId: this.userPoolId,
			AuthFlow: "CUSTOM_AUTH",
			AuthParameters: {
				USERNAME: username
			}
		}));

		// Answer the custom challenge by providing the token
		const challengeResponses = {
			USERNAME: username,
			ANSWER: accessToken
		};
		return this.respondToAuthChallenge(<string>result.ChallengeName, challengeResponses, clientId, result.Session);
	}

	/***
	 * Refreshes the users Authentication using their valid refresh token
	 */
	async refreshToken(clientId: string, refreshToken: string) : Promise<AdminInitiateAuthCommandOutput> {
		return await this.client.send(new AdminInitiateAuthCommand({
			UserPoolId: this.userPoolId,
			ClientId: clientId,
			AuthFlow: "REFRESH_TOKEN_AUTH",
			AuthParameters: {
				REFRESH_TOKEN: refreshToken
			}
		}));
	}

	async respondToAuthChallenge(challengeName: string, challengeResponses: Record<string, string>, clientId: string, session?: string) : Promise<AdminRespondToAuthChallengeCommandOutput> {
		return this.client.send(new AdminRespondToAuthChallengeCommand(<AdminRespondToAuthChallengeCommandInput>{
			UserPoolId: this.userPoolId,
			ClientId: clientId,
			ChallengeName: challengeName,
			ChallengeResponses: challengeResponses,
			...(session ? { Session: session } : {})
		}));
	}

	/**
	 * Verifies that a client is valid and matches the redirectUri
	 */
	async verifyClient(clientId: string, redirectUri: string) {
		const result : { valid: boolean, message: string | undefined } = {
			valid: false,
			message: undefined
		};

		try {
			const params = {
				ClientId: clientId,
				UserPoolId: this.userPoolId
			};

			const data = await this.client.send(new DescribeUserPoolClientCommand(params));
			if (data.UserPoolClient && data.UserPoolClient.CallbackURLs) {
				const uris = data.UserPoolClient.CallbackURLs;
				const found = uris.find(uri => uri.toLowerCase() === redirectUri.toLowerCase()) !== undefined;
				result.valid = found;
				if (!found) {
					result.message = "Invalid RedirectUri for Client";
				}
			}
		} catch (error) {
			result.message = "Invalid Client";
		}

		return result;
	}
}
