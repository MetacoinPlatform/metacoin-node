const router = require('express').Router()
const config = require('../../config.json');

const { request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_response_process,
	response } = require('../utils/lib.express')


function get_nonce(req, res) {
	ParameterCheck(req.params, 'address', "address");
	try{
		const block_addr = require('../../block_addr.json');
		if(req.params.address in block_addr){
			response(req, res, 404, 'Address ' + req.params.address + ' is blocked');
			return;
		}
	} catch(e){
		// block_addr json file not exists or ...
	}

	request.get(config.MTCBridge + "/nonce/" + req.params.address,
		function (err, response) { default_response_process(err, req, res, response); });
}

function get_balance(req, res) {
	req.db.get('ADDRESS:CURRENT:' + req.params.address, { asBuffer: false }, (isError, value) => {
		if (isError) {
			response(req, res, 404, 'Address ' + req.params.address + ' not found');
		} else {
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
		}
	});
}

function get_balanceex(req, res) {

	req.db.get('ADDRESS:CURRENT:' + req.params.address, { asBuffer: false }, (isError, value) => {
		if (isError) {
			response(req, res, 404, 'Address ' + req.params.address + ' not found');
		} else {
			var a = JSON.parse(value);
			response(req, res, 200, {
				mrc010: a.balance,
				mrc402: a.mrc402
			});
			}
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
			try {
				var data = JSON.parse(body.text);
			} catch (e) {
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

async function  get_address(req, res) {
	var return_value = [];
	for await (const [key, value] of req.db.iterator({
		gte: "ADDRESS:LOG:" + req.params.address + ":00000000000000000000000000000000",
		lte: "ADDRESS:LOG:" + req.params.address + ":99999999999999999999999999999999",
		limit: 50,
		reserve: true,
		keys: false,
		valueAsBuffer : false
	})) {
		return_value.push(value);
	}
	if (return_value.length > 0) {
		return_value.reverse();
		response(req, res, 200, return_value);
	} else {
		response(req, res, 404, 'Address ' + req.params.address + ' not found');
	}
}

function post_address_by_key(req, res) {
	ParameterCheck(req.body, 'publickey');
	var fix_key = req.body.publickey.replace(/(\\n|\\r|\r|\n|-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----)/gm, "").trim();
	req.db.get('ADDR_BY_PUBLICKEY:' + fix_key, { asBuffer: false }, (isError, value) => {
		if (isError) {
			response(req, res, 404, 'Address not found');
		} else {
			response(req, res, 200, JSON.parse(value));
		}
	});
}

router.get('/getkey/:keytype/:address', get_nonce);
router.get('/nonce/:address', get_nonce);
router.get('/balance/:address', get_balance);
router.get('/balanceex/:address', get_balanceex);

router.get('/address/:address', get_address);
router.post('/address', post_address);
router.post('/address/bykey', post_address_by_key);


module.exports = router
