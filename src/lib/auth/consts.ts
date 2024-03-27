export const AuthConstants = {
    LoginResults: {
        LoggedIn: "logged_in",
        CodeFlowInitiated: "code_flow_initiated",
        Refreshed: "refreshed",
    },
    ClientGrantTypes: {
        Code: "authorization_code",
        Refresh: "refresh_token"
    }
};

export const GRANT_CONSTANTS = {
    TTL_MINUTES: 15,
    EXPIRED_CODE_MINUTES: 5
};
