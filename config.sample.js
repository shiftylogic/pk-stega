'use strict';

module.exports = {
    aad: {
        tokenFile: "<path to a file containing a refresh token goes here>",

        clientId: "<client id goes here>",
        clientSecret: "<client secret goes here",
        redirectUrl: "https://playground.vroov.com:9443/token",
        scopes: [
            "offline_access",
            "https://graph.microsoft.com/User.ReadBasic.All",
            "https://graph.microsoft.com/User.ReadWrite",
            "https://graph.microsoft.com/Mail.ReadWrite",
        ],
    },
};
