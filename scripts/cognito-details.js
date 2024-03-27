const {
	CognitoIdentityProviderClient,
	ListUserPoolClientsCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const { CloudFormationClient, DescribeStacksCommand} = require("@aws-sdk/client-cloudformation");
const fs = require("fs");

const service = serverless.service;
const provider = serverless.getProvider("aws");
const region = provider.getRegion();

const credentials = provider.getCredentials().credentials;
credentials.region = region;

const displayDetails = async () => {
	const { apiUrl, userPoolId} = await getUserPoolId();
	const clients = await getClients(userPoolId);
	const details = {
		apiUrl,
		userPoolId,
		clients
	};

	console.log(details);
	fs.writeFileSync(`${process.cwd()}/.cognito-details.json`, JSON.stringify(details, null, 2), "utf-8");
};

const getUserPoolId = async () => {
	const client = new CloudFormationClient({ credentials, region });
	const response = await client.send(new DescribeStacksCommand({
		StackName: service.service
	}));
	const stack = response.Stacks[0];
	const userPoolId = stack.Outputs.find(x => x.OutputKey === "UserPoolId").OutputValue;
	const apiUrl = stack.Outputs.find(x => x.OutputKey === "ApiGatewayRestApiUrl").OutputValue;
	return {
		apiUrl,
		userPoolId
	};
};

const getClients = async (userPoolId) => {
	const client = new CognitoIdentityProviderClient({ credentials, region });
	const response = await client.send(new ListUserPoolClientsCommand({
		UserPoolId: userPoolId
	}));
	return response.UserPoolClients.map(x => ({ clientId: x.ClientId, name: x.ClientName }));
};

displayDetails();
