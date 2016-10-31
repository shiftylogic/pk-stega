'use strict';

const fs = require('fs');
const lwip = require('lwip');
const graph = require('msgraph-sdk-javascript');

const aad = require('./lib/aad');
const sec = require('./lib/sec');
const stega = require('./lib/stega');
const BufferStream = require('./lib/streamie');

const config = require('./config');

const keys = loadKeys();
const client = graph.init({
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

    const process = (err, image) => { console.log('  > in process');
        if (err) throw err;
        console.log(ctx.meta);
        image.writeFile('bob.jpg', () => console.log("saved"));
    };

    const load2 = () => { console.log('  > in load2');
        const buf = new Buffer(ctx.data);
        lwip.open(buf, process);
    };

    const load = (err, photo) => { console.log('  > in load');
        if (err) throw err;
        photo.on('data', chunk => ctx.data += chunk);
        photo.on('err', err => { throw err; });
        photo.on('end', load2);
    };

    const getData = (err, meta) => {
        if (err) throw err;
        ctx.meta = meta;
        client.api('/me/photo/$value').getStream(load);
    };

    client.api('/me/photo').get(getData);
}


//storePublicKey();
// getDrafts((err, messages) => {
//     messages.forEach(m => console.log(m.subject));
//     //signDraft(messages[1]);
//     verifyDraft(messages[1]);
// });




function loadKeys() {
    return {
        pri: {
            key: fs.readFileSync('/Users/robert/.signkey'),
            passphrase: 'boom',
        },
        pub: fs.readFileSync('/Users/robert/.verifykey'),
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

