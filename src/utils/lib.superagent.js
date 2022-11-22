const superagent = require('superagent');

const http_request = {
    post: async function (url, param, callback) {
        if (callback !== undefined) {
            superagent
                .post(url)
                .type('form')
                .send(param)
                .end(callback)
        } else {
            return await superagent
                .post(url)
                .type('form')
                .send(param)
        }

    },
    get: async function (url, callback) {
        if (callback !== undefined) {
            superagent
                .get(url)
                .type('form')
                .end(callback)
        } else {
            return await superagent
                .get(url)
                .type('form')
        }
    },
    put: async function (url, param, callback) {
        if (callback !== undefined) {
            superagent
                .put(url)
                .type('form')
                .send(param)
                .end(callback)
        } else {
            return await superagent
                .put(url)
                .type('form')
                .send(param)
        }
    },
    delete: async function (url, param, callback) {
        if (callback !== undefined) {
            superagent
                .delete(url)
                .type('form')
                .send(param)
                .end(callback)
        } else {
            return await superagent
                .delete(url)
                .type('form')
                .send(param)
        }
    },
}

module.exports = {
    http_request
}
