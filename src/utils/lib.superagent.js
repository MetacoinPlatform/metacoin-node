const superagent = require('superagent');

const request = {
    post: function (url, param, callback) {
        superagent
            .post(url)
            .type('form')
            .send(param)
            .end(callback);
    },
    get: function (url, callback) {
        superagent
            .get(url)
            .type('form')
            .end(callback);
    },
    put: function (url, param, callback) {
        superagent
            .put(url)
            .type('form')
            .send(param)
            .end(callback);
    },
    delete: function (url, param, callback) {
        superagent
            .delete(url)
            .type('form')
            .send(param)
            .end(callback);
    },
}

module.exports = {
	request
}
