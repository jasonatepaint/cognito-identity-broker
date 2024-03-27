import crypto from "crypto";
import {oAuthTokenCollection} from "../models/login";

const bufferToString = (buffer): string => {
    const CHARSET =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const state: string[] = [];
    for (let i = 0; i < buffer.byteLength; i += 1) {
        const index = buffer[i] % CHARSET.length;
        state.push(CHARSET[index]);
    }
    return state.join('');
};

export const generateState = (length: number) : string => {
    let result = '';
    let i = length;
    const chars =
        '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (; i > 0; --i)
        result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
};

export const generateChallenge = (code: string) : string => {
    return crypto.createHash('sha256').update(code).digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

export const generateRandom = (size: number) : string => {
    const buffer = crypto.randomBytes(size);
    return bufferToString(buffer);
};


/****
 * Creates a single convention for the properties of a JWT Token auth response.
 * This is because, depending on the way we get this data (SDK vs Cognito HTTP domain call,
 * we will get 2 different forms of the token collection.
 * @param auth - The Cognito authentication of JWT tokens
 * @return {oAuthTokenCollection}
 */
export const formatTokenResponse = (auth: any) : oAuthTokenCollection => {
    return {
        accessToken: auth.accessToken || auth.access_token || auth.AccessToken,
        idToken: auth.idToken || auth.id_token || auth.IdToken,
        refreshToken: auth.refreshToken || auth.refresh_token || auth.RefreshToken,
        expiresIn: auth.expiresIn || auth.expires_in || auth.ExpiresIn,
        tokenType: auth.tokenType || auth.token_type || auth.TokenType
    };
};
