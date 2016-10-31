'use strict';

const lwip = require('lwip');

const COUNT_BYTES = 2;
const SUPPORTED_IMAGE_TYPES = [ 'jpg', 'png', 'gif' ];


function decodeCore(image, cb) {
    const w = image.width();
    const h = image.height();

    const bits = [];

    let x = 0;
    let y = 0;
    let cur = 0;
    let bitsLeft = 0;

    const nextPixel = () => {
        const p = image.getPixel(x, y);

        // Move across then down.
        ++x;
        if (x >= w) {
            x = 0;
            ++y;
        }

        // If we go past end of image, exit
        if (y >= h)
            return false;

        bits.push(p.r & 1);
        bits.push(p.g & 1);
        bits.push(p.b & 1);

        return true;
    };

    const nextByte = () => {
        while (bits.length < 8 && nextPixel());

        if (bits.length < 8)
            return -1;

        let v = 0;
        for (let i = 0; i < 8; ++i)
            v = v | (bits.shift() << i);

        return v;
    };

    const buf = Buffer.allocUnsafe(COUNT_BYTES);
    for (let i = 0; i < COUNT_BYTES; ++i) {
        buf[i] = nextByte();
    }

    let dataBytes = buf.readUInt16LE();
    let index = 0;
    const data = Buffer.allocUnsafe(dataBytes);

    while (dataBytes-- > 0) {
        data[index++] = nextByte();
    }

    cb(null, data.toString('utf8'));
}

function decode(imageData, imageType, cb) {
    if (!Buffer.isBuffer(imageData)) {
        cb("The 'imageData' argument must be a Buffer containing the raw image data.");
    }

    const type = imageType.toLowerCase();

    if (SUPPORTED_IMAGE_TYPES.indexOf(type) === -1) {
        cb("The 'imageType' specified is not a supported type.");
    }

    lwip.open(imageData, type, (err, image) => {
        if (err) {
            cb(err);
            return;
        }

        decodeCore(image, cb);
    });
}


function encodeCore(image, msg, cb) {
    const w = image.width();
    const h = image.height();
    const maxBytes = Math.floor(w * h * 3 / 8);
    const msgBytes = Buffer.byteLength(msg);
    const dataBytes = msgBytes + COUNT_BYTES;
    const data = Buffer.allocUnsafe(dataBytes);

    if (dataBytes > maxBytes) {
        cb("Message size is too large for target image.");
        return;
    }

    data.writeUInt16LE(msgBytes);
    data.write(msg, COUNT_BYTES, msgBytes, 'utf8');

    // console.log(`Needed: ${dataBytes}; Max: ${maxBytes}`);

    const batch = image.batch();
    const bits = [];
    let index = 0;

    const stretchNextByte = () => {
        if (index >= dataBytes)
            return false;

        const b = data[index++];

        for (let i = 0; i < 8; ++i)
            bits.push((b & (1 << i)) >> i);

        return true;
    };

    const nextBit = () => {
        if (bits.length === 0 && !stretchNextByte())
            return -1;

        return bits.shift();
    };

    let stop = false;

    for (let y = 0; !stop && y < h; y++) {
        for (let x = 0; !stop && x < w; x++) {
            const p = image.getPixel(x, y);

            for (let i = 0; i < 3; ++i) {
                const b = nextBit();
                if (b == -1) {
                    stop = true;
                    break;
                }

                switch (i) {
                    case 0: // Use the red channel
                        p.r = (p.r & 0xFE) | b;
                        break;

                    case 1: // Use the green channel
                        p.g = (p.g & 0xFE) | b;
                        break;

                    case 2: // Use the blue channel
                        p.b = (p.b & 0xFE) | b;
                        break;
                }
            }

            batch.setPixel(x, y, p);
        }
    }

    batch.exec(cb);
}

function encode(imageData, imageType, msg, cb) {
    if (!Buffer.isBuffer(imageData)) {
        cb("The 'imageData' argument must be a Buffer containing the raw image data.");
    }

    const type = imageType.toLowerCase();

    if (SUPPORTED_IMAGE_TYPES.indexOf(type) === -1) {
        cb("The 'imageType' specified is not a supported type.");
    }

    if (typeof msg !== 'string' || msg === '') {
        cb("A non-empty message must be specified.");
    }

    lwip.open(imageData, type, (err, image) => {
        if (err) {
            cb(err);
            return;
        }

        encodeCore(image, msg, (err, image) => {
            image.toBuffer(type, cb);
        });
    });
}


module.exports = {
    decode,
    encode,
};
