import {HttpContext} from './httpContext';
import {APIGatewayProxyResult} from "aws-lambda/trigger/api-gateway-proxy";

const getHeaders = (body: string, httpContext: HttpContext, encoding : BufferEncoding = "utf-8") => {
	const response = {
		'Content-Type': 'application/json',
		"Content-Length":  Buffer.byteLength(body || "", encoding)
	};

	if (encoding === "base64")
		response["Content-Encoding"] = encoding;

	return response;
};

const buildBaseResponse = (httpContext: HttpContext, success = true) => {
	return {
		requestId: httpContext.requestId,
		requestStartTime: httpContext.requestTime,
		requestEndTime: new Date().toISOString(),
		success
	};
};

export type HttpResponse<T> = ReturnType<typeof buildBaseResponse> & { data?: T }

export const buildHttpResponse = <T = any>(httpContext: HttpContext, statusCode: number, data: T, headers = {}) : APIGatewayProxyResult => {
	let body = "";
	let encoding: BufferEncoding = "utf-8";

	const baseResponse: HttpResponse<T> = buildBaseResponse(httpContext);
	if (data) {
		baseResponse.data = data;
	}
	body = jsonStringify(baseResponse);

	//Capture all multiValue headers (any array value) and shift them to a multiValue variable
	const multiValueHeaders = {};
	headers = Object.assign({}, headers);
	Object.keys(headers).forEach(h => {
		const header = headers[h];
		if (Array.isArray(header)) {
			multiValueHeaders[h] = header;
		}
	});
	Object.keys(multiValueHeaders).forEach(h => delete headers[h]);

	const response = {
		statusCode,
		headers: {
			...getHeaders(body, httpContext, encoding),
			...headers
		},
		multiValueHeaders
	};

	return {
		...response,
		body
	};
};

export type HttpErrorResponse = HttpResponse<any> & { error: any }

export const buildHttpErrorResponse = (httpContext: HttpContext, error: any, statusCode = 400) : APIGatewayProxyResult => {
	const response: HttpErrorResponse = buildBaseResponse(httpContext, false) as HttpErrorResponse;
	response.error = error.message;

	const body = jsonStringify(response);
	return {
		statusCode,
		body,
		headers: getHeaders(body, httpContext)
	};
};

const jsonStringify = (response: any) => {
	return JSON.stringify(response, (key, value) => {
		return setJsonValue(value);
	});
};

const setJsonValue = (value: any) => {
	if (value === null) {
		return undefined;
	}

	//eslint-disable-next-line valid-typeof
	if (typeof value === "bigint") {
		return value.toString();
	}

	if (Array.isArray(value)) {
		const items: any[] = [];
		value.forEach(x => {
			const v = setJsonValue(x);
			if (v) {
				items.push(v);
			}
		});
		return items;
	}

	return value; // return everything else unchanged
}
