'use strict';

const fs = require('fs');
const superagent = require('superagent');

let token;

function getAccessToken(config, cb) {
    if (token) {
        cb(null, token);
        return;
    }

    const refreshToken = fs.readFileSync(config.tokenFile);

    refresh(config, refreshToken, (err, result) => {
        if (err) {
            cb(err);
            return;
        }

        fs.writeFileSync(config.tokenFile, result.refresh_token);
        token = result.access_token;
        cb(null, result.access_token);
    });
}

function refresh(config, refreshToken, cb) {
    const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const scope = config.scopes.join(' ');
    const params = {
        "client_id": config.clientId,
        "client_secret": config.clientSecret,
        "grant_type": "refresh_token",
        "refresh_token": refreshToken,
        "scope": scope,
    };

    superagent
        .post(tokenUrl)
        .type('form')
        .send(params)
        .end((err, result) => {
            if (err)
                cb(err);
            else
                cb(null, result.body);
        });
}


module.exports = {
    getAccessToken,
    refresh,
};
