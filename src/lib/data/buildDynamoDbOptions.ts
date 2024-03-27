import {MARSHALL_OPTIONS, UNMARSHALL_OPTIONS} from "./consts";
import { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";

export const buildDynamoDbOptions = () => {
	const region = process.env.AWS_DEFAULT_REGION;
	let options:DynamoDBClientConfig = {};
	if (region) {
		options.region = region;
	}
	// connect to local DB if running offline
	if (process.env.STAGE === "local") {
		//required for dynamodb-local
		if (!process.env.AWS_ACCESS_KEY_ID)
			process.env.AWS_ACCESS_KEY_ID="fake_access_id";
		if (!process.env.AWS_SECRET_ACCESS_KEY)
			process.env.AWS_SECRET_ACCESS_KEY="fake_access_key";

		options = {
			endpoint: "http://localhost:8000",
			region: "local",
			...(process.env.MOCK_DYNAMODB_ENDPOINT && {
				endpoint: process.env.MOCK_DYNAMODB_ENDPOINT
			})
		};
	}
	return options;
};

export const getDynamoMarshallTranslateConfig = () => {
	return {
		marshallOptions: MARSHALL_OPTIONS,
		unmarshallOptions: UNMARSHALL_OPTIONS
	};
};
