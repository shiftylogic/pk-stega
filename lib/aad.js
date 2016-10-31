/*

The MIT License (MIT)

Copyright (c) 2016 Robert Anderson.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

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


//   ______                            _
//  |  ____|                          | |
//  | |__   __  __ _ __    ___   _ __ | |_  ___
//  |  __|  \ \/ /| '_ \  / _ \ | '__|| __|/ __|
//  | |____  >  < | |_) || (_) || |   | |_ \__ \
//  |______|/_/\_\| .__/  \___/ |_|    \__||___/
//                | |
//                |_|

module.exports = {
    getAccessToken,
    refresh,
};
