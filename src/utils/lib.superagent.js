const superagent = require('superagent');

const http_request = {
	post: async function (url, param, callback, send_type = 'form') {
		if (callback !== undefined) {
			superagent
				.post(url)
				.type(send_type)
				.send(param)
				.end(callback)
		} else {
			return await superagent
				.post(url)
				.type(send_type)
				.send(param)
		}

	},
	get: async function (url, callback, send_type = 'form') {
		if (callback !== undefined) {
			superagent
				.get(url)
				.type(send_type)
				.end(callback)
		} else {
			return await superagent
				.get(url)
				.type(send_type)
		}
	},
	put: async function (url, param, callback, send_type = 'form') {
		if (callback !== undefined) {
			superagent
				.put(url)
				.type(send_type)
				.send(param)
				.end(callback)
		} else {
			return await superagent
				.put(url)
				.type(send_type)
				.send(param)
		}
	},
	delete: async function (url, param, callback, send_type = 'form') {
		if (callback !== undefined) {
			superagent
				.delete(url)
				.type(send_type)
				.send(param)
				.end(callback)
		} else {
			return await superagent
				.delete(url)
				.type(send_type)
				.send(param)
		}
	},
}

module.exports = {
	http_request
}
