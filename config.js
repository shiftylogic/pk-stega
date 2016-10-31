'use strict';

module.exports = {
    aad: {
        tokenFile: "/Users/robert/.aadmagic",

        clientId: "4ee5b793-662e-48fa-8494-16d79f73073a",
        clientSecret: "JcWTaZxJOD8aocJ0vYfzri4",
        redirectUrl: "https://playground.vroov.com:9443/token",
        scopes: [
            "offline_access",
            "https://graph.microsoft.com/User.ReadBasic.All",
            "https://graph.microsoft.com/User.ReadWrite",
            "https://graph.microsoft.com/Mail.ReadWrite",
        ],
    },
};
