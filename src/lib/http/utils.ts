import {APIGatewayProxyEvent} from "aws-lambda";

export const getObjectFromRequest = (event: APIGatewayProxyEvent) => {
    try {
        return JSON.parse(<string>event.body);
    } catch (e) {
        /* istanbul ignore next */
        return {};
    }
};
