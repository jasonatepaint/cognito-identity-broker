import {CognitoClient} from "../../lib/cognito";
import {generateChallenge, generateRandom} from "../../lib/cognito/utils";

export const createUser = async (event) => {
    const { email, name, password } = event;
    const client = new CognitoClient();
    return await client.createUser(email, name, password);
};

export const generateChallengeData = async () => {
    const codeVerifier = generateRandom(128);
    const codeChallenge = generateChallenge(codeVerifier);
    return {
        codeChallenge,
        codeVerifier
    }
};
