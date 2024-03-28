import {buildHttpErrorResponse, buildHttpResponse} from "./httpResponses";
import {HttpContext} from "./httpContext";
import {APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";

export const RequestTimeoutBufferMs = 250;

export type ResponseBuilder = (ctx: any, successStatusCode: number, data: any, headers: any) => any

export type ResponseFromExceptionBuilder = (ctx: any, error: any) => any

export interface HandleRequestOptions {
    /* The Http status code to return for successful calls */
    successfulStatusCode: number
    /* If set to `true`, the promise result should return as `{ data, headers }` */
    resultHasHeaders: boolean
    /* Builds a response using context */
    buildResponse: ResponseBuilder
    /* Builds a response using context and thrown error */
    buildResponseFromException: ResponseFromExceptionBuilder
}

const DEFAULT_OPTIONS: HandleRequestOptions = {
    successfulStatusCode: 200,
    resultHasHeaders: false,
    buildResponse: buildHttpResponse,
    buildResponseFromException: buildHttpErrorResponse
};

export const handleRequest = async <Response = any> (
    ctx: HttpContext,
    promise: Promise<Response>,
    options: HandleRequestOptions = DEFAULT_OPTIONS
): Promise<APIGatewayProxyResult> => {
    options = {
        ...DEFAULT_OPTIONS,
        ...options
    };
    //add a buffer to the timeout to allow for overhead in the lambda call.
    //this will allow the resulting error to come from our function and not as
    //a result of a timeout at the api gateway
    let ms = (ctx.timeout || HttpContext.timeout) - RequestTimeoutBufferMs;
    if (ms <= 0) ms = RequestTimeoutBufferMs;
    const timeout = new Promise((resolve, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(`Function Timeout: ${{ timeoutMs: ms}}`));
        }, ms);
    });

    let response: any;
    try {
        const result = await Promise.race([
            promise,
            timeout
        ]);
        const data = options.resultHasHeaders ? (result as { data: any }).data : result;
        const headers = options.resultHasHeaders ? (result as { headers: any }).headers : {};
        response = options.buildResponse(ctx, options.successfulStatusCode, data, headers);
    }
    catch (e){
        console.error(e);
        response = options.buildResponseFromException(ctx, e);
    }
    return response;
};

