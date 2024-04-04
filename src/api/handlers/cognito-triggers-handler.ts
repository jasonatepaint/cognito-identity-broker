import { AuthService } from "../../lib/auth/authService";
import {
    CreateAuthChallengeTriggerEvent,
    DefineAuthChallengeTriggerEvent,
    VerifyAuthChallengeResponseTriggerEvent,
} from "aws-lambda";

const CUSTOM_CHALLENGE = "CUSTOM_CHALLENGE";

/**
 * Handle the Cognito Custom Auth flow
 * https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-challenge.html
 */
export const cognitoAuthTriggers = async (
    event:
        | CreateAuthChallengeTriggerEvent
        | DefineAuthChallengeTriggerEvent
        | VerifyAuthChallengeResponseTriggerEvent,
) => {
    const { triggerSource } = event;
    console.debug(triggerSource, JSON.stringify(event, null, 2));

    switch (triggerSource) {
        case "CreateAuthChallenge_Authentication":
            return createAuthChallenge(event);
        case "DefineAuthChallenge_Authentication":
            return defineAuthChallenge(event);
        case "VerifyAuthChallengeResponse_Authentication":
            return verifyAuthChallenge(event);
        default:
            throw Error(`triggerSource "${triggerSource} is not supported`);
    }
};

const createAuthChallenge = async (event: CreateAuthChallengeTriggerEvent) => {
    if (event.request?.challengeName !== CUSTOM_CHALLENGE) {
        return event;
    }

    // This function does nothing, the challenge does not need to be prepared
    // Verify challenge will just verify the token provided
    event.response.publicChallengeParameters = {};
    event.response.publicChallengeParameters.question = "TheQuestion";
    event.response.privateChallengeParameters = {};
    event.response.privateChallengeParameters.answer = "TheAnswer";
    event.response.challengeMetadata = "TOKEN_CHALLENGE";
    console.log(
        "RESULT RESPONSE EVENT",
        JSON.stringify(event.response, null, 2),
    );
    return event;
};

/**
 * This function defines the sequence to obtain a consumer client token from a valid broker token
 */
const defineAuthChallenge = async (event: DefineAuthChallengeTriggerEvent) => {
    // This is the first invocation, we ask for a custom challenge (providing a valid token)
    if (event.request.session.length === 0) {
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
        event.response.challengeName = CUSTOM_CHALLENGE;
    } else if (event.request.session.length === 1) {
        const session = event.request.session[0];
        if (
            session.challengeName === CUSTOM_CHALLENGE &&
            session.challengeResult
        ) {
            // The custom challenge has been answered we return the token
            event.response.issueTokens = true;
            event.response.failAuthentication = false;
        }
    }
    console.log(
        "RESULT RESPONSE EVENT",
        JSON.stringify(event.response, null, 2),
    );
    return event;
};

const verifyAuthChallenge = async (
    event: VerifyAuthChallengeResponseTriggerEvent,
) => {
    const svc = new AuthService();
    const accessToken = event.request.challengeAnswer;
    event.response.answerCorrect = await svc.verifyAuthChallenge(
        event.userName,
        accessToken,
    );
    console.log(
        "RESULT RESPONSE EVENT",
        JSON.stringify(event.response, null, 2),
    );
    return event;
};
