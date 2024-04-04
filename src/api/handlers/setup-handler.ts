import { generateChallenge, generateRandom } from "../../lib/cognito/utils";
import {
    AdminCreateUserCommand,
    AdminCreateUserCommandInput,
    AdminGetUserCommand,
    AdminSetUserPasswordCommand,
    CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import {
    CloudFormationClient,
    DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

export const createUser = async (event: any) => {
    const { email, name, password } = event;

    const client = new CloudFormationClient();
    const response = await client.send(
        new DescribeStacksCommand({
            StackName: "cognito-identity-broker",
        }),
    );
    const outputs = response.Stacks![0].Outputs || [];
    const userPoolId = outputs.find(
        (x) => x.OutputKey === "UserPoolId",
    )!.OutputValue;

    const cognitoClient = new CognitoIdentityProviderClient();
    const params = <AdminCreateUserCommandInput>{
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
            {
                Name: "name",
                Value: name,
            },
            {
                Name: "email",
                Value: email,
            },
        ],
        DesiredDeliveryMediums: ["EMAIL"],
        MessageAction: "SUPPRESS",
    };
    const res = await cognitoClient.send(new AdminCreateUserCommand(params));

    await cognitoClient.send(
        new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: res.User?.Username,
            Password: password,
            Permanent: true,
        }),
    );

    return await cognitoClient.send(
        new AdminGetUserCommand({
            UserPoolId: userPoolId,
            Username: res.User?.Username,
        }),
    );
};

export const generateChallengeData = async () => {
    const codeVerifier = generateRandom(128);
    const codeChallenge = generateChallenge(codeVerifier);
    return {
        codeChallenge,
        codeVerifier,
    };
};
