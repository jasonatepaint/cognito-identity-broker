import { APIGatewayProxyEvent, Context } from "aws-lambda";

export class HttpContext {
    requestId?: string;
    requestTime: string;
    lambdaEvent: APIGatewayProxyEvent;
    lambdaContext: Context;

    constructor(lambdaEvent: APIGatewayProxyEvent, lambdaContext: Context) {
        this.lambdaEvent = lambdaEvent;
        this.lambdaContext = lambdaContext;
        this.requestTime = new Date().toISOString();
        this.requestId = lambdaContext?.awsRequestId;
    }

    static get timeout() {
        /* istanbul ignore next */
        return 5000;
    }

    get timeout() {
        if (process.env.IS_OFFLINE === "true") {
            /* istanbul ignore next */
            return 60000 * 5;
        }

        return this.lambdaContext?.getRemainingTimeInMillis
            ? this.lambdaContext?.getRemainingTimeInMillis()
            : HttpContext.timeout;
    }
}
