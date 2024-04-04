import { cognitoAuthTriggers } from "../../src/api/handlers/cognito-triggers-handler";
import { AuthService } from "../../src/lib/auth/authService";
import {
    CreateAuthChallengeTriggerEvent,
    DefineAuthChallengeTriggerEvent,
    VerifyAuthChallengeResponseTriggerEvent,
} from "aws-lambda";

jest.mock("../../src/lib/auth/authService");

const mockAuthService = AuthService as jest.Mock;

describe("Cognito Auth Triggers", () => {
    test("invalid operation", async () => {
        let event = {
            triggerSource: "SomeInvalidTriggerSource",
            response: {},
        };
        await expect(cognitoAuthTriggers(<any>event)).rejects.toThrowError();
    });

    describe("Create Auth Challenge", () => {
        test("as expected", async () => {
            let event = <CreateAuthChallengeTriggerEvent>{
                triggerSource: "CreateAuthChallenge_Authentication",
                request: {
                    challengeName: "CUSTOM_CHALLENGE",
                },
                response: {},
            };
            const res = <CreateAuthChallengeTriggerEvent>(
                await cognitoAuthTriggers(event)
            );
            expect(res.response.publicChallengeParameters.question).toEqual(
                "TheQuestion",
            );
            expect(res.response.privateChallengeParameters.answer).toEqual(
                "TheAnswer",
            );
            expect(res.response.challengeMetadata).toEqual("TOKEN_CHALLENGE");
        });

        test("not a custom challenge", async () => {
            let event = {
                triggerSource: "CreateAuthChallenge_Authentication",
                request: {
                    challengeName: "NOPE",
                },
                response: {},
            };
            const res = await cognitoAuthTriggers(<any>event);
            expect(res.response).toEqual(event.response);
        });
    });

    describe("Define Auth Challenge", () => {
        test("no session", async () => {
            const event = <DefineAuthChallengeTriggerEvent>(<unknown>{
                triggerSource: "DefineAuthChallenge_Authentication",
                request: {
                    session: [],
                },
                response: {},
            });
            const res = <DefineAuthChallengeTriggerEvent>(
                await cognitoAuthTriggers(event)
            );
            expect(res.response.issueTokens).toBeFalsy();
            expect(res.response.failAuthentication).toBeFalsy();
            expect(res.response.challengeName).toEqual("CUSTOM_CHALLENGE");
        });

        test("has exactly 1 valid session", async () => {
            const event = <DefineAuthChallengeTriggerEvent>{
                triggerSource: "DefineAuthChallenge_Authentication",
                request: {
                    session: [
                        {
                            challengeName: "CUSTOM_CHALLENGE",
                            challengeResult: true,
                        },
                    ],
                },
                response: {},
            };
            const res = <DefineAuthChallengeTriggerEvent>(
                await cognitoAuthTriggers(event)
            );
            expect(res.response.issueTokens).toBeTruthy();
            expect(res.response.failAuthentication).toBeFalsy();
        });

        test("invalid session", async () => {
            let event = <DefineAuthChallengeTriggerEvent>{
                triggerSource: "DefineAuthChallenge_Authentication",
                request: {
                    session: [
                        {
                            challengeName: "CUSTOM_CHALLENGE",
                            challengeResult: false,
                        },
                    ], //challengeRule false
                },
                response: {},
            };
            const res = await cognitoAuthTriggers(event);
            expect(res.response).not.toHaveProperty("issueTokens");
            expect(res.response).not.toHaveProperty("failAuthentication");
        });

        test("multiple sessions", async () => {
            let event = <DefineAuthChallengeTriggerEvent>{
                triggerSource: "DefineAuthChallenge_Authentication",
                request: {
                    session: [{}, {}],
                },
                response: {},
            };
            const res = await cognitoAuthTriggers(event);
            expect(res.response).not.toHaveProperty("issueTokens");
            expect(res.response).not.toHaveProperty("failAuthentication");
        });
    });

    describe("Verify Auth Challenge", () => {
        let accessToken;
        beforeEach(() => {
            accessToken = "xxxxyyyy";
            mockAuthService.prototype.verifyAuthChallenge.mockClear();
            mockAuthService.prototype.verifyAuthChallenge.mockResolvedValue(
                true,
            );
        });

        test("as expected", async () => {
            const event = <VerifyAuthChallengeResponseTriggerEvent>{
                userName: "123-123-123",
                triggerSource: "VerifyAuthChallengeResponse_Authentication",
                request: { challengeAnswer: accessToken },
                response: {},
            };
            const res = <VerifyAuthChallengeResponseTriggerEvent>(
                await cognitoAuthTriggers(event)
            );
            expect(res.response.answerCorrect).toBeTruthy();

            expect(
                AuthService.prototype.verifyAuthChallenge,
            ).toHaveBeenCalledTimes(1);
            expect(
                AuthService.prototype.verifyAuthChallenge,
            ).toHaveBeenCalledWith(event.userName, accessToken);
        });

        test("verify fails", async () => {
            mockAuthService.prototype.verifyAuthChallenge.mockResolvedValue(
                false,
            );
            const event = <VerifyAuthChallengeResponseTriggerEvent>{
                userName: "123-123-123",
                triggerSource: "VerifyAuthChallengeResponse_Authentication",
                request: { challengeAnswer: accessToken },
                response: {},
            };
            const res = <VerifyAuthChallengeResponseTriggerEvent>(
                await cognitoAuthTriggers(event)
            );
            expect(res.response.answerCorrect).toBeFalsy();

            expect(
                AuthService.prototype.verifyAuthChallenge,
            ).toHaveBeenCalledTimes(1);
            expect(
                AuthService.prototype.verifyAuthChallenge,
            ).toHaveBeenCalledWith(event.userName, accessToken);
        });
    });
});
