import { CognitoClient } from "../../../src/lib/cognito";
import {
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
    AdminRespondToAuthChallengeCommand,
    GetUserCommand,
    DescribeUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { mockClient } from "aws-sdk-client-mock";

const username = "email@email.com";
const userPoolId = "us-east-1_12345";
const clientId = "123456";
const cognitoIdpClientMock = mockClient(CognitoIdentityProviderClient);

let accessToken: string;
let client: CognitoClient;

const getMockAwsClientCommandParams = (
    mockClient,
    command,
    commandIndex = 0,
    argIndex = 0,
) => {
    return mockClient.commandCalls(command)[commandIndex].args[argIndex].input;
};

beforeEach(() => {
    process.env.COGNITO_POOL_ID = userPoolId;
    cognitoIdpClientMock.reset();
    client = new CognitoClient();
});

describe("Get User from Token", () => {
    let cognitoUser: any;

    beforeEach(() => {
        accessToken = "xxxxyyyyy";
        cognitoUser = {
            USERNAME: "1234",
        };
        cognitoIdpClientMock.on(GetUserCommand).resolves(cognitoUser);
    });

    test("as expected", async () => {
        const user = await client.getUserFromToken(accessToken);
        expect(user).toEqual(cognitoUser);

        //Cognito called
        expect(cognitoIdpClientMock).toHaveReceivedCommandTimes(
            GetUserCommand,
            1,
        );
        expect(cognitoIdpClientMock).toHaveReceivedCommandWith(GetUserCommand, {
            AccessToken: accessToken,
        });
    });
});

describe("User Login", () => {
    test("as expected", async () => {
        await client.userLogin(clientId, username, "password1");

        //Cognito called
        expect(cognitoIdpClientMock).toHaveReceivedCommandTimes(
            AdminInitiateAuthCommand,
            1,
        );
        let params = getMockAwsClientCommandParams(
            cognitoIdpClientMock,
            AdminInitiateAuthCommand,
        );
        expect(params.UserPoolId).toEqual(userPoolId);
        expect(params.ClientId).toEqual(clientId);
        expect(params.AuthFlow).toEqual("ADMIN_USER_PASSWORD_AUTH");
        expect(params.AuthParameters).toEqual({
            USERNAME: username,
            PASSWORD: "password1",
        });
    });
});

describe("Initiate Custom Auth", () => {
    let initiateAuthResult: any;
    beforeEach(() => {
        accessToken = "xxxxxxyyyy";
        initiateAuthResult = {
            ChallengeName: "TOKEN_CHALLENGE",
            Session: "123974043234234",
        };
        cognitoIdpClientMock
            .on(AdminInitiateAuthCommand)
            .resolves(initiateAuthResult);
    });

    test("as expected", async () => {
        await client.initiateCustomAuth(clientId, username, accessToken);

        //adminInitiateAuth called
        expect(cognitoIdpClientMock).toHaveReceivedCommandTimes(
            AdminInitiateAuthCommand,
            1,
        );
        let params = getMockAwsClientCommandParams(
            cognitoIdpClientMock,
            AdminInitiateAuthCommand,
        );
        expect(params.UserPoolId).toEqual(userPoolId);
        expect(params.ClientId).toEqual(clientId);
        expect(params.AuthFlow).toEqual("CUSTOM_AUTH");
        expect(params.AuthParameters).toEqual({
            USERNAME: username,
        });

        //respondToAuthChallenge called
        expect(cognitoIdpClientMock).toHaveReceivedCommandTimes(
            AdminRespondToAuthChallengeCommand,
            1,
        );
        params = getMockAwsClientCommandParams(
            cognitoIdpClientMock,
            AdminRespondToAuthChallengeCommand,
        );
        expect(params.UserPoolId).toEqual(userPoolId);
        expect(params.ClientId).toEqual(clientId);
        expect(params.ChallengeName).toEqual(initiateAuthResult.ChallengeName);
        expect(params.ChallengeResponses).toEqual({
            USERNAME: username,
            ANSWER: accessToken,
        });
        expect(params.Session).toEqual(initiateAuthResult.Session);
    });
});

describe("Refresh Token", () => {
    test("as expected", async () => {
        await client.refreshToken(clientId, "12345");

        //Cognito called
        expect(cognitoIdpClientMock).toHaveReceivedCommandTimes(
            AdminInitiateAuthCommand,
            1,
        );
        let params = getMockAwsClientCommandParams(
            cognitoIdpClientMock,
            AdminInitiateAuthCommand,
        );
        expect(params.UserPoolId).toEqual(userPoolId);
        expect(params.ClientId).toEqual(clientId);
        expect(params.AuthFlow).toEqual("REFRESH_TOKEN_AUTH");
        expect(params.AuthParameters).toEqual({
            REFRESH_TOKEN: "12345",
        });
    });
});

describe("Respond to Auth Challenge", () => {
    let challengeResponse: any;

    beforeEach(() => {
        challengeResponse = {
            USERNAME: username,
            SMS_MFA_CODE: "12345",
        };
    });

    test("as expected", async () => {
        await client.respondToAuthChallenge(
            "CUSTOM_CHALLENGE",
            challengeResponse,
            clientId,
            "session",
        );

        //Cognito called
        expect(cognitoIdpClientMock).toHaveReceivedCommandTimes(
            AdminRespondToAuthChallengeCommand,
            1,
        );
        let params = getMockAwsClientCommandParams(
            cognitoIdpClientMock,
            AdminRespondToAuthChallengeCommand,
        );
        expect(params.UserPoolId).toEqual(userPoolId);
        expect(params.ClientId).toEqual(clientId);
        expect(params.ChallengeName).toEqual("CUSTOM_CHALLENGE");
        expect(params.ChallengeResponses).toEqual(challengeResponse);
        expect(params.Session).toEqual("session");
    });
});

describe("Verify Client", () => {
    let clientResponse: any;

    const uri = "https://some.domain.com/auth";
    beforeEach(() => {
        clientResponse = {
            UserPoolClient: {
                CallbackURLs: ["https://wwww.other.domain.com", uri],
            },
        };
        cognitoIdpClientMock
            .on(DescribeUserPoolClientCommand)
            .resolves(clientResponse);
    });

    test("as expected", async () => {
        let r = await client.verifyClient(clientId, uri);
        expect(r.valid).toBeTruthy();
        expect(r.message).toBeUndefined();
    });

    test("invalid redirectUri", async () => {
        let r = await client.verifyClient(clientId, uri + "/extra");
        expect(r.valid).toBeFalsy();
        expect(r.message).toEqual("Invalid RedirectUri for Client");

        r = await client.verifyClient(clientId, "https://domain.com");
        expect(r.valid).toBeFalsy();
        expect(r.message).toEqual("Invalid RedirectUri for Client");
    });

    test("case-insensitive redirectUri", async () => {
        let r = await client.verifyClient(clientId, uri.toUpperCase());
        expect(r.valid).toBeTruthy();
        expect(r.message).toBeUndefined();

        r = await client.verifyClient(clientId, uri.toLowerCase());
        expect(r.valid).toBeTruthy();
        expect(r.message).toBeUndefined();
    });

    test("invalid clientId", async () => {
        cognitoIdpClientMock
            .on(DescribeUserPoolClientCommand)
            .rejects(new Error());
        let r = await client.verifyClient(clientId, uri);
        expect(r.valid).toBeFalsy();
        expect(r.message).toEqual("Invalid Client");
    });
});
