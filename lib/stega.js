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

const lwip = require('lwip');

const COUNT_BYTES = 2;
const SUPPORTED_IMAGE_TYPES = [ 'jpg', 'png', 'gif' ];


//   _____                         _  _
//  |  __ \                       | |(_)
//  | |  | |  ___   ___  ___    __| | _  _ __    __ _
//  | |  | | / _ \ / __|/ _ \  / _` || || '_ \  / _` |
//  | |__| ||  __/| (__| (_) || (_| || || | | || (_| |
//  |_____/  \___| \___|\___/  \__,_||_||_| |_| \__, |
//                                               __/ |
//                                              |___/

// decodeCore contains the basic logic for decoding an image (must be
// an image object from the 'lwip' library) into a buffer of data.
function decodeCore(image) {
    const w = image.width();
    const h = image.height();
    console.log(`Width: ${w}, Height: ${h}`);

    // A bit collector array for storying data as we extract from
    // the image and process into data bytes.
    const bits = [];

    let x = 0;
    let y = 0;
    let cur = 0;
    let bitsLeft = 0;

    // An inner function to process the next logical pixel and place
    // the bits of data from the pixel into the bit collector array.
    // If the function returns false, there is no more data.
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

        // Push the bits into the bit collector.
        bits.push(p.r & 1);
        bits.push(p.g & 1);
        bits.push(p.b & 1);

        return true;
    };

    // An inner function used to process pixels until there is enough
    // bits to return a full byte of data. Data is always returned
    // as an unsigned number between 0 and 255 inclusive.
    // If the function returns -1, there is no data left to return.
    const nextByte = () => {
        while (bits.length < 8 && nextPixel());

        if (bits.length < 8)
            return -1;

        let v = 0;
        for (let i = 0; i < 8; ++i)
            v = v | (bits.shift() << i);

        return v;
    };

    // First we need to read and decode the amount of data that
    // is encoded in the image.
    const buf = Buffer.allocUnsafe(COUNT_BYTES);
    for (let i = 0; i < COUNT_BYTES; ++i) {
        buf[i] = nextByte();
    }

    let dataBytes = buf.readUInt16LE();
    console.log(`Data Length: ${dataBytes}`);
    let index = 0;
    const data = Buffer.allocUnsafe(dataBytes);

    // Now we extract the data from the image into a buffer a
    // byte at a time.
    while (dataBytes-- > 0) {
        data[index++] = nextByte();
    }

    return data;
}

// decode is the exported function for decoding image data into a
// buffer containing the hidden data.
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

        const data = decodeCore(image);
        cb(null, data);
    });
}


//   ______                         _  _
//  |  ____|                       | |(_)
//  | |__    _ __    ___  ___    __| | _  _ __    __ _
//  |  __|  | '_ \  / __|/ _ \  / _` || || '_ \  / _` |
//  | |____ | | | || (__| (_) || (_| || || | | || (_| |
//  |______||_| |_| \___|\___/  \__,_||_||_| |_| \__, |
//                                                __/ |
//                                               |___/

// encodeCore contains the basic logic for encoding a buffer of data
// into an image (will be an image object from the 'lwip' library).
function encodeCore(image, dataToEncode, cb) {
    if (!Buffer.isBuffer(dataToEncode)) {
        cb("The 'dataToEncode' argument must be a Buffer containing the message to encode.");
    }

    const w = image.width();
    const h = image.height();
    const maxBytes = Math.floor(w * h * 3 / 8);
    const dataBytes = dataToEncode.length + COUNT_BYTES;

    if (dataBytes > maxBytes) {
        cb("Message size is too large for target image.");
        return;
    }

    // Need to write the size of the data to a temporary buffer.
    const countData = Buffer.allocUnsafe(COUNT_BYTES);
    countData.writeUInt16LE(dataToEncode.length);
    console.log(`Data bytes: ${dataToEncode.length}`);

    // Allocate a buffer containing the count buffer plus the data buffer.
    const data = Buffer.concat([countData, dataToEncode], dataBytes);

    // Start a batch operation on the image so we can do all the image
    // manipulation at once.
    const batch = image.batch();

    // A bit collector for storing extra bits while encoding pixels of data.
    const bits = [];
    let index = 0;

    // An inner function that turns the next byte of data from the data
    // buffer into a stream of bits that can be encoded into the pixels.
    // Bits are placed into the bit collector.
    // If the function returns false, there is no more data to encode.
    const stretchNextByte = () => {
        if (index >= dataBytes)
            return false;

        const b = data[index++];

        for (let i = 0; i < 8; ++i)
            bits.push((b & (1 << i)) >> i);

        return true;
    };

    // An inner function that pulls the next single bit of data from
    // the data buffer. This may involve refilling the bit collector
    // as needed.
    // If the function returns -1, there is no bits of data left.
    const nextBit = () => {
        if (bits.length === 0 && !stretchNextByte())
            return -1;

        return bits.shift();
    };

    // We only need to run this set of nested loops until we have fully
    // encoded the entire message.
    let stop = false;

    for (let y = 0; !stop && y < h; y++) {
        for (let x = 0; !stop && x < w; x++) {
            const p = image.getPixel(x, y);

            // Encode the next 1 to 3 bits of data into the current pixel.
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

            // Adds the writing of this pixel to the batch of operations.
            batch.setPixel(x, y, p);
        }
    }

    // Commit the batch of image operations to the image.
    batch.exec(cb);
}

// encode is the exported function for encoding a buffer of data into an image.
function encode(imageData, imageType, data, cb) {
    if (!Buffer.isBuffer(imageData)) {
        cb("The 'imageData' argument must be a Buffer containing the raw image data.");
    }

    const type = imageType.toLowerCase();

    if (SUPPORTED_IMAGE_TYPES.indexOf(type) === -1) {
        cb("The 'imageType' specified is not a supported type.");
    }

    if (typeof data === 'string' && data !== '') {
        data = Buffer.from(data, 'utf8');
    }

    if (!Buffer.isBuffer(data)) {
        cb("The 'data' argument must be a Buffer or string containing the message to encode.");
    }

    lwip.open(imageData, type, (err, image) => {
        if (err) {
            cb(err);
            return;
        }

        encodeCore(image, data, (err, image) => {
            image.toBuffer(type, cb);
        });
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
    decode,
    encode,
};
