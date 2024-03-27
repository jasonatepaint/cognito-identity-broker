import { v4 as uuidv4 } from 'uuid';
import {CodeGrant} from "../models/codeGrant";
import {oAuthTokenCollection} from "../models/login";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	DeleteCommand,
	GetCommand,
	PutCommand,
	PutCommandOutput,
	GetCommandInput,
	DeleteCommandInput,
	DeleteCommandOutput
} from "@aws-sdk/lib-dynamodb";
import {buildDynamoDbOptions, getDynamoMarshallTranslateConfig} from "./buildDynamoDbOptions";
import { ttlFromMinutes } from "../utils/dayjs";

let dynamoDbDocClient: DynamoDBDocumentClient;

/**
 * Handles all low-level DynamoDb SDK calls
 */
export class DataService {
	tableName: string;

	constructor() {
		this.tableName = process.env.GRANTS_TABLE || "NOT-SET";
		if (!dynamoDbDocClient) {
			const client = new DynamoDBClient(buildDynamoDbOptions());
			dynamoDbDocClient = DynamoDBDocumentClient.from(client, getDynamoMarshallTranslateConfig());
		}
	}

	/**
	 * Gets an item with params (Key, TableName)
	 * @param params
	 */
	async getWithParams<T>(params: GetCommandInput) : Promise<T | undefined> {
		if (!params) {
			throw new Error("Missing params");
		}
		const result = await dynamoDbDocClient.send(new GetCommand(params));
		return result.Item ? result.Item as T: undefined;
	}

	async put(item: object) : Promise<PutCommandOutput> {
		const params = {
			TableName: this.tableName,
			Item: item
		};
		return await dynamoDbDocClient.send(new PutCommand(params));
	}

	async delete (key: DeleteCommandInput) : Promise<DeleteCommandOutput> {
		if (!key) {
			throw new Error("Missing Key");
		}
		return await dynamoDbDocClient.send(new DeleteCommand({
			TableName: this.tableName,
			Key: key
		}));
	}

	/***
	 * @param {string} code - Authorization Code
	 */
	async getGrant(code: string) : Promise<CodeGrant | undefined> {
		return await this.getWithParams({
			TableName: this.tableName,
			Key: { code }
		});
	}

	async setGrant(clientId: string, redirectUri: string, codeChallenge: string | undefined, encryptedCredentials: oAuthTokenCollection, minutesToLive = 5) : Promise<CodeGrant> {
		const { accessToken, idToken, refreshToken, expiresIn, tokenType } = encryptedCredentials;
		const data = {
			code: uuidv4(),
			clientId,
			codeChallenge,
			redirectUri,
			ttl: ttlFromMinutes(minutesToLive),
			dt: new Date().toISOString(),
			accessToken,
			idToken,
			refreshToken,
			expiresIn,
			tokenType
		};
		await this.put(data);
		return data;
	}

	async deleteGrant(code: string) {
		await this.delete(<any>{code});
	}
}
