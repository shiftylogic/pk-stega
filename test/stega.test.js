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
const stega = require('../lib/stega');


function basicEncodeDecode() {
    const data = 'Some text';

    const verify = (err, buf) => console.log(buf);
    const decode = (err, buf) => stega.decode(buf, 'png', verify);
    const encode = (err, buf) => stega.encode(buf, 'png', data, decode);
    const toBuffer = (err, image) => image.toBuffer('png', encode);

    console.log(data, '=>', Buffer.from(data, 'utf8'));

    lwip.create(100, 100, toBuffer);
}

basicEncodeDecode();