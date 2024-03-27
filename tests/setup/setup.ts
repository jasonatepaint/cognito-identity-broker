import 'aws-sdk-client-mock-jest';

jest.setTimeout(1000 * 60);

process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = "true";

//put setup code here
process.env.STAGE = "local";
process.env.GRANTS_TABLE = "grants";
