import {DecryptCommand, EncryptCommand, KMSClient} from "@aws-sdk/client-kms";

export const encryptToken = async (token: string) => {
	const kmsClient = new KMSClient();
	const keyIdAlias = process.env.KMS_COGNITO_ALIAS;
	const params = {
		KeyId: keyIdAlias,
		Plaintext: Buffer.from(token)
	};
	const data = await kmsClient.send(new EncryptCommand(params));
	return Buffer.from(<Uint8Array>data.CiphertextBlob).toString("base64");
}

export const decryptToken = async (encryptedToken: string) =>{
	const kmsClient = new KMSClient();
	const params = {
		CiphertextBlob: Buffer.from(encryptedToken, 'base64')
	};
	const data = await kmsClient.send(new DecryptCommand(params));
	return Buffer.from(<Uint8Array>data.Plaintext).toString();
}
