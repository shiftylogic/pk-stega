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

const crypto = require('crypto');


//   _____         _                             _
//  |_   _|       | |                           | |
//    | |   _ __  | |_  ___  _ __  _ __    __ _ | |
//    | |  | '_ \ | __|/ _ \| '__|| '_ \  / _` || |
//   _| |_ | | | || |_|  __/| |   | | | || (_| || |
//  |_____||_| |_| \__|\___||_|   |_| |_| \__,_||_|

// hashContent uses the standard crypto libraries and hashs
// a string or buffer into a hash token.
function hashContent(content) {
    const hasher = crypto.createHash('SHA256');
    hasher.update(content);
    return hasher.digest();
}


//   ______                            _
//  |  ____|                          | |
//  | |__   __  __ _ __    ___   _ __ | |_  ___
//  |  __|  \ \/ /| '_ \  / _ \ | '__|| __|/ __|
//  | |____  >  < | |_) || (_) || |   | |_ \__ \
//  |______|/_/\_\| .__/  \___/ |_|    \__||___/
//                | |
//                |_|

// sign takes a content string or buffer, hashes the content
// into a hash token, and signs it using the provided key.
function sign(content, key) {
    const hash = hashContent(content);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(hash);

    return signer.sign(key, 'hex');
}

// verify takes a content string or buffer, hashes teh content
// into a hash token, and attempts to verify the hash based on
// a supplied signature and public key.
function verify(content, signature, key) {
    const hash = hashContent(content);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(hash);
    return verifier.verify(key, signature, 'hex');
}


module.exports = {
    sign,
    verify,
};
