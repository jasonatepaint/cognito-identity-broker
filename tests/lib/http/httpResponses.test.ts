import { HttpContext } from "../../../src/lib/http";
import { buildHttpResponse, buildHttpErrorResponse } from "../../../src/lib/http/httpResponses";

let timeout = 2000;
const lambdaContext = {
	getRemainingTimeInMillis: () => { return timeout; }
}
const origin = "https://some.domain.com";
const ctx = new HttpContext(<any>{
	headers: {
		origin
	}
}, <any>lambdaContext);

beforeEach(() => {
	process.env.STAGE = "local";
});

describe('Http Response', function () {
	test("response with explicit statusCode", () => {
		const data = { snuh: "buh" };
		const result = buildHttpResponse(ctx, 302, data);
		expect(result.statusCode).toEqual(302);
		const r = JSON.parse(<string>result.body);
		expect(r.success).toBeTruthy();
		expect(r.error).not.toBeDefined();
		expect(r.data).toEqual(data);
	});

	test("with data", () => {
		const data = { snuh: "buh" };
		const result = buildHttpResponse(ctx, 200, data);
		const r = JSON.parse(<string>result.body);
		expect(r.success).toBeTruthy();
		expect(r.error).not.toBeDefined();
		expect(r.data).toEqual(data);
	});

	test("supports headers", () => {
		const data = { snuh: "buh" };
		const headers = {
			"location": "https://url.com"
		};
		const result = buildHttpResponse(ctx, 200, data, headers);
		expect(result.headers!["location"]).toEqual(headers["location"]);

		const r = JSON.parse(<string>result.body);
		expect(r.success).toBeTruthy();
		expect(r.error).not.toBeDefined();
		expect(r.data).toEqual(data);
	});
	//
	// test("supports multi-value headers", () => {
	// 	const data = { snuh: "buh" };
	// 	const headers = {
	// 		"set-cookie": [ "0ne", "2wo", "thr33" ],  //multiValue Header
	// 	};
	// 	const result = buildHttpResponse(ctx, 200, data, headers);
	// 	expect(result.multiValueHeaders["set-cookie"]).toEqual(headers["set-cookie"]);
	// 	expect(result.headers!["set-cookie"]).toBeUndefined();
	//
	// 	const r = JSON.parse(<string>result.body);
	// 	expect(r.success).toBeTruthy();
	// 	expect(r.error).not.toBeDefined();
	// 	expect(r.data).toEqual(data);
	// });

	test("overwrites default headers", () => {
		const data = { snuh: "buh" };
		const headers = {
			"Access-Control-Allow-Origin": "domain.com",
			'Content-Type': 'application/html'
		};
		const result = buildHttpResponse(ctx, 200, data, headers);
		expect(result.headers).toHaveProperty("Access-Control-Allow-Origin", "domain.com");
		expect(result.headers).toHaveProperty("Content-Type", "application/html");
	});
});

describe("Http Response from Exception", () => {

	test("with error", async () => {
		const error = new Error();
		error.message = "Something failed";
		const result = buildHttpErrorResponse(ctx, error);
		expect(result.statusCode).toEqual(400);
		const r = JSON.parse(<string>result.body);
		expect(r.success).toBeFalsy();
		expect(r.error).toEqual(error.message);
	});
});
