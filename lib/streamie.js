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

const stream = require('stream');


// Taken and slightly modified from the following blog post:
//   https://www.bennadel.com/blog/2681-turning-buffers-into-readable-streams-in-node-js.htm

// BufferStream is a class to convert a supplied source Buffer into a Node Readable Stream.
class BufferStream extends stream.Readable {
    constructor(source) {
        if (!Buffer.isBuffer(source)) {
            throw new Error("'source' must be a buffer.");
        }

        this._source = source;
        this._offset = 0;
        this._length = source.length;

        this.on("end", this._destroy.bind(this));
    }

    // _read will be called when the stream wants to pull data
    // This is called *only* by the underlying stream implementation and should
    // NOT be called by the user of this class.
    _read(size) {
        if (this._offset < this._length) {
            this.push(this._source.slice(this._offset, this._offset + size));
            this._offset += size;
        }

        if (this._offset >= this._length) {
            this.push(null);
        }
    }

    // _destroy is triggered at the end of the buffer being processed by the
    // readable stream implementation to dereferehce the source buffer and
    // clean up variables.
    _destroy() {
        this._source = null;
        this._offset = null;
        this._length = null;
    }
}


//   ______                            _
//  |  ____|                          | |
//  | |__   __  __ _ __    ___   _ __ | |_  ___
//  |  __|  \ \/ /| '_ \  / _ \ | '__|| __|/ __|
//  | |____  >  < | |_) || (_) || |   | |_ \__ \
//  |______|/_/\_\| .__/  \___/ |_|    \__||___/
//                | |
//                |_|

module.exports = BufferStream;
