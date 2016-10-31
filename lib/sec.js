'use strict';

const crypto = require('crypto');

function generateKeys() {
    const dh = crypto.createDiffieHellman(2048);
    dh.generateKeys();
    return {
        pri: dh.getPrivateKey(),
        pub: dh.getPublicKey(),
    }
}

function hashContent(content) {
    const hasher = crypto.createHash('SHA256');
    hasher.update(content);
    return hasher.digest();
}

function sign(content, key) {
    const hash = hashContent(content);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(hash);

    return signer.sign(key, 'hex');
}

function verify(content, signature, key) {
    const hash = hashContent(content);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(hash);
    return verifier.verify(key, signature, 'hex');
}


module.exports = {
    generateKeys,
    sign,
    verify,
};
