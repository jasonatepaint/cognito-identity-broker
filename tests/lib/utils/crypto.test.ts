import { mockClient } from "aws-sdk-client-mock";
import { DecryptCommand, EncryptCommand, KMSClient } from "@aws-sdk/client-kms";
import { encryptToken, decryptToken } from "../../../src/lib/utils/crypto";

let token, encryptedToken;
const kmsClientMock = mockClient(KMSClient);

beforeEach(() => {
    process.env.KMS_COGNITO_ALIAS = "alias/cognito-alias";
    token = "token";
    const enc = "xxxxxxxx";
    encryptedToken = Buffer.from(enc).toString("base64");

    jest.clearAllTimers();

    kmsClientMock
        .on(EncryptCommand)
        .resolves({ CiphertextBlob: Buffer.from(enc) });
    kmsClientMock
        .on(DecryptCommand)
        .resolves({ Plaintext: Buffer.from(token) });
});

describe("Encrypt & Decrypt Token", () => {
    test("encrypt", async () => {
        await encryptToken(token);
        expect(kmsClientMock).toHaveReceivedCommandTimes(EncryptCommand, 1);
        expect(kmsClientMock).toHaveReceivedCommandWith(EncryptCommand, {
            KeyId: `${process.env.KMS_COGNITO_ALIAS}`,
            Plaintext: Buffer.from(token),
        });
    });

    test("decrypt", async () => {
        await decryptToken(encryptedToken);
        expect(kmsClientMock).toHaveReceivedCommandTimes(DecryptCommand, 1);
        expect(kmsClientMock).toHaveReceivedCommandWith(DecryptCommand, {
            CiphertextBlob: Buffer.from(encryptedToken, "base64"),
        });
    });
});
