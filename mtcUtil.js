/* jshint esversion: 6 */
/* jshint node: true */
"use strict";

const crypto = require('crypto');
const {
    crc32
} = require('crc');

function NumberPadding(a) {
    return ("0000000000000000" + a).substr(-16);
}

function ParameterCheck(v, n, checktype, isOption, minlength, maxlength) {
    if (v[n] === undefined) {
        if(typeof(isOption) != 'undefined' && isOption){
            v[n] = '';
            return;
        } else {
            throw new Error("Parameter " + n + " is missing");
        }
    }
    if (typeof v[n] != typeof "") {
        return;
    }
    v[n] = v[n].trim();
    if(v[n].length == 0 && isOption) {
        return;
    }

    if(checktype == undefined || checktype == '' || checktype == 'string') {
        if (maxlength != undefined && maxlength > 0) {
            if (v[n].length > maxlength) {
                throw new Error("The length of parameter " + n + "  must be less than " + maxlength);
            }
        }

        if (minlength != undefined && minlength > 0) {
            if (v[n].length < minlength) {
                throw new Error("The length of parameter " + n + "  must be greater than " + minlength);
            }
        }

    } else if (checktype == "int") {
        if (maxlength != undefined && maxlength > 0) {
            if (v[n].length > maxlength) {
                throw new Error("The length of parameter " + n + "  must be less than " + maxlength);
            }
        }

        if (minlength != undefined && minlength > 0) {
            if (v[n].length < minlength) {
                throw new Error("The length of parameter " + n + "  must be greater  than " + minlength);
            }
        }

        if (v[n] != "" && !isNormalInteger(v[n])) {
            throw new Error("The type of Parameter " + n + " must be integer");
        }
    } else if (checktype == "address") {
        if (!isAddress(v[n])) {
            throw new Error("Parameter " + n + " must be Metacoin Address");
        }
    } else if (checktype == 'url') {
                if(v[n].length == 0 && minlength == 0){
                        return;
                }
        var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
        var url = new RegExp(urlRegex, 'i');
        if (v[n].length >= 2083 || !url.test(v[n])) {
            throw new Error("Parameter " + n + " is must be URL");
        }
    }
}

function isAddress(addr) {
    if (addr.length != 40) {
        return false;
    }

    if (addr.slice(0, 2) != "MT") {
        return false;
    }
    let checksum = "00000000" + crc32(addr.slice(2, 32)).toString(16);
    if (addr.slice(32, 40) != checksum.slice(-8)) {
        return false;
    }
    return true;
}


function isNormalInteger(str) {
    return /^\+?(0|[1-9]\d*)$/.test(str);
}

function getRandomString(keylength) {
    let chars = "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
    let rnd = crypto.randomBytes(keylength);
    let value = new Array(keylength);
    let len = Math.min(256, chars.length);
    let d = 256 / len;
    for (var i = 0; i < keylength; i++) {
        value[i] = chars[Math.floor(rnd[i] / d)];
    }
    return value.join('');
}


module.exports.NumberPadding = NumberPadding;
module.exports.ParameterCheck = ParameterCheck;
module.exports.isAddress = isAddress;

module.exports.isNormalInteger = isNormalInteger;
module.exports.getRandomString = getRandomString;