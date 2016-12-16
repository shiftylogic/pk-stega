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

const util = require('util');
const fs = require('fs');
const lwip = require('lwip');
const graph = require('msgraph-sdk-javascript');

const aad = require('./lib/aad');
const sec = require('./lib/sec');
const stega = require('./lib/stega');
const BufferStream = require('./lib/streamie');

const config = require('./config');

const keys = loadKeys();
const client = graph.Client.init({
    authProvider: aad.getAccessToken.bind(null, config.aad),
})

function getDrafts(cb) {
    const mapMessage = m => {
        return {
            id: m.id,
            subject: m.subject,
            body: m.body,
            to: m.toRecipients,
        };
    };

    const process = (err, res) => {
        if (err) {
            cb(err);
            return;
        }

        const drafts = res.value.map(mapMessage);
        cb(null, drafts);
    };

    client
        .api("/me/mailFolders('Drafts')/messages")
        .get(process);
}

function signDraft(msg, cb) {
    const footer = `[Signature: ${sec.sign(msg.body.content, keys.pri)}]`;
    const draftUpdate = {
        body: {
            contentType: msg.body.contentType,
            content: msg.body.content + footer,
        }
    };

    client
        .api(`/me/messages/${msg.id}`)
        .patch(draftUpdate, (err, res) => console.log(`Err: ${err}`));
}

function sendDraft(msg, cb) {
    client
        .api(`/me/messages/${msg.id}/send`)
        .post(null, cb);
}

function verifyDraft(msg) {
    const sigRE = /\[Signature: ([\w\d]+)\]/;
    const m = msg.body.content.match(sigRE);
    if (!m || m.length < 1) {
        console.log("Email is not signed");
        return;
    }

    const signature = m[1];
    const content = msg.body.content.replace(sigRE, '');

    console.log(`Valid? ${sec.verify(content, signature, keys.pub)}`);
}

function storePublicKey() {
    const ctx = {
        data: '',
    };

    const upload = (err, image) => { console.log('  > in upload');
        if (err) throw err;

        // TODO: Push back to Graph

        const ws = fs.createWriteStream('/Users/robert/src/pub_dude.png');
        ws.end(image, console.log);

        // console.log(ctx.meta);
        // image.writeFile('bob.jpg', () => console.log("saved"));
    };

    const injectKey2 = (err, imageData) => { console.log('  > in attach key');
        if (err) throw err;
        console.log(keys.pub);
        // lwip.open(resp.body, 'png', process);
        stega.encode(imageData, 'png', keys.pub, upload);
    };

    const injectKey = (err, imageData) => {
        if (err) throw err;
        const ws = fs.createWriteStream('/Users/robert/src/dude.png');
        ws.end(imageData, () => { console.log("saved"); injectKey2(null, imageData) });
    };

    const convertToPng = (err, image) => {
        if (err) throw err;
        image.toBuffer('png', injectKey);
    };

    const loadJpeg = (err, resp) => {
        if (err) throw err;
        lwip.open(resp.body, 'jpg', convertToPng);
    };

    const load = (err, photoStream) => { console.log('  > in load');
        if (err) throw err;
        photoStream.end(loadJpeg);

        // photoStream.on('close', () => console.log('photo stream closed.'));
        // photoStream.on('readable', () => console.log('photo stream data incoming...'));
        // photoStream.on('error', err => { throw err; });
        // photoStream.on('end', load2);
        // photoStream.on('data', chunk => { console.log('new chunk...'); ctx.data += chunk });
        // photoStream.resume();

        // const ws = fs.createWriteStream('/Users/robert/src/dude.jpg');
        // photoStream.pipe(ws).on('error', console.log);
    };

    const getData = (err, meta) => {
        if (err) throw err;
        ctx.meta = meta;

        // v1.0 '$value' for photo is broken so switching to beta for now.
        client.api('/me/photo/$value').getStream(load);
    };

    client.api('/me/photo').get(getData);
}
storePublicKey();


function getPublicKey() {
    const ctx = {
        data: '',
    };

    const verifyKey = (err, key) => {
        if (err) throw err;

        console.log(key);
    };

    const extractKey = (err, imageBuffer) => {
        if (err) throw err;
        console.log(imageBuffer);

        // console.log(ctx.data);
        // const imageBuffer = Buffer.from(ctx.data);

        stega.decode(imageBuffer, 'png', verifyKey);
    };

    // TODO: Load image from Graph.

    // const rs = fs.createReadStream('/Users/robert/src/pub_dude.jpg');
    // rs.on('end', extractKey);
    // rs.on('error', err => { throw err });
    // rs.on('data', chunk => ctx.data += chunk);

    lwip.open('/Users/robert/src/pub_dude.png', (err, image) => {
        if (err) throw err;
        image.toBuffer('png', extractKey);
    });
}
//getPublicKey();

// getDrafts((err, messages) => {
//     messages.forEach(m => console.log(m.subject));
//     //signDraft(messages[1]);
//     verifyDraft(messages[1]);
// });




function loadKeys() {
    return {
        pri: {
            key: fs.readFileSync('/Users/robert/src/.signkey'),
            passphrase: 'hockey',
        },
        pub: fs.readFileSync('/Users/robert/src/.verifykey'),
    }
}

function createPhoto() {
    lwip.create(240, 240, 'blue', (err, image) => {
        image.toBuffer('jpg', (err, buf) => {
            const stream = new BufferStream(buf);
            client.api('/me/photo/$value').put(stream, (err) => console.log("Err:", err));
        });
    });
}
//createPhoto();


// (function createDrafts(drafts, err) { console.log(err);
//     if (drafts.length === 0) return;

//     const cur = drafts.shift();
//     client
//         .api('/me/messages')
//         .post(cur, createDrafts.bind(null, drafts));
// })([{
//     subject: "Dude, where's my car?",
//     body: {
//         contentType: "text",
//         content: "Bring it back before I bury you!\n\n--\nSweet"
//     }
// }, {
//     subject: "It is ON!",
//     body: {
//         contentType: "text",
//         content: "Get your tickets booked. The trip is on. Those craps tables are calling my name!\n\n--\nLoser"
//     }
// }, {
//     subject: "Bye Bye",
//     body: {
//         contentType: "text",
//         content: "Consider this my resignation. You are all great people, but this work is shit!\n\n--\nHired"
//     }
// }]);

