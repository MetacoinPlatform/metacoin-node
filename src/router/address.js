const router = require('express').Router()
const config = require('../../config.json');

const { request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_response_process,
	response } = require('../utils/lib.express')


function get_key(req, res) {
	ParameterCheck(req.params, 'address', "address");

	let allowkey = {
		'transfer': 1,
		'token': 1,
		'dapp': 1,
		'exchange': 1,
		'mrc020': 1,
		'mrc030': 1,
		'mrc040': 1,
		'mrc100': 1,
	}
	if (allowkey[req.params.keytype] == undefined) {
		response(req, res, 412, "Key type unknown");
		return;
	}
	request.get(config.MTCBridge + "/getkey/" + req.params.keytype + '/' + req.params.address,
		function (err, response) { default_response_process(err, req, res, response) });

}

function get_nonce(req, res) {
	ParameterCheck(req.params, 'address', "address");

	request.get(config.MTCBridge + "/nonce/" + req.params.address,
		function (err, response) { default_response_process(err, req, res, response); });
}

function get_balance(req, res) {
	req.db.get('ADDRESS:CURRENT:' + req.params.address)
		.then(function (value) {
			var a = JSON.parse(value);
			for (var k in a.pending) {
				a.balance.push({
					balance: "0",
					token: k,
					unlockdate: "0",
					pending: a.pending[k]
				});
			}
			response(req, res, 200, a.balance);
		})
		.catch(function (err) {
			response(req, res, 404, 'Address ' + req.params.address + ' not found');
		});
}

function get_balanceex(req, res) {

	req.db.get('ADDRESS:CURRENT:' + req.params.address)
		.then(function (value) {
			var a = JSON.parse(value);
			response(req, res, 200, {
				mrc010: a.balance,
				mrc402: a.mrc402
			});
		})
		.catch(function (err) {
			response(req, res, 404, 'Address ' + req.params.address + ' not found');
		});
}


function post_address(req, res) {
	if (req.body.publickey === undefined || req.body.publickey.length == 0) {
		response(req, res, 412, "Parameter publickey is missing");
		return;
	}

	request.post(config.MTCBridge + "/address",
		req.body,
		function (error, body) {
			if (error != null) {
				response(req, res, 412, "MTC Server connection error");
				return;
			}
			try{
				var data = JSON.parse(body.text);
			} catch(e) {
				response(req, res, 500, "Server response error");
			}

			var data = JSON.parse(body.text);
			if (data.result != 'SUCCESS') {
				response(req, res, 412, data.msg);
				return;
			} else {
				response(req, res, 200, data.data);
			}
		});
}

function get_address(req, res) {
	var return_value = [];
	req.db.createReadStream({
		gte: "ADDRESS:LOG:" + req.params.address + ":00000000000000000000000000000000",
		lte: "ADDRESS:LOG:" + req.params.address + ":99999999999999999999999999999999",
		limit: 50,
		reserve: true
	})
		.on('data', function (data) {
			return_value.push(data.value);
		})
		.on('error', function (err) {
			response(req, res, 400, err.message);
		})
		.on('end', function () {
			if (return_value.length > 0) {
				return_value.reverse();
				response(req, res, 200, return_value);
			} else {
				response(req, res, 404, 'Address ' + req.params.address + ' not found');
			}
		});
}

function post_address_by_key(req, res) {
	ParameterCheck(req.body, 'publickey');
	var fix_key = req.body.publickey.replace(/(\\n|\\r|\r|\n|-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----)/gm, "").trim();
	req.db.get('ADDR_BY_PUBLICKEY:' + fix_key)
		.then(function (value) {
			response(req, res, 200, JSON.parse(value));
		})
		.catch(function (err) {
			response(req, res, 404, 'Address not found');
		});
}

router.get('/getkey/:keytype/:address', get_key);
router.get('/nonce/:address', get_nonce);
router.get('/balance/:address', get_balance);
router.get('/balanceex/:address', get_balanceex);

router.get('/address/:address', get_address);
router.post('/address', post_address);
router.post('/address/bykey', post_address_by_key);


module.exports = router
