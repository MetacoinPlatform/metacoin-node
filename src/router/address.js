const router = require('express').Router()
const config = require('../../config.json');

const { http_request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { wrapRoute,
	default_response_process,
	default_response } = require('../utils/lib.express')


async function get_nonce(req, res) {
	ParameterCheck(req.params, 'address', "address");
	try {
		const block_addr = require('../../block_addr.json');
		if (req.params.address in block_addr) {
			default_response(req, res, 404, 'Address ' + req.params.address + ' is blocked');
			return;
		}
	} catch (e) {
		// block_addr json file not exists or ...
	}

	http_request.get(config.MTCBridge + "/nonce/" + req.params.address,
		function (err, response) { default_response_process(err, req, res, response); });
}

async function get_balance(req, res) {
	ParameterCheck(req.params, 'address', "address");
	try {
		let addr_json = await req.db.get('ADDRESS:CURRENT:' + req.params.address, { asBuffer: false })
		let addr_info = JSON.parse(addr_json)
		for (var k in addr_info.pending) {
			addr_info.balance.push({
				balance: "0",
				token: k,
				unlockdate: "0",
				pending: addr_info.pending[k]
			});
		}
		default_response(req, res, 200, addr_info.balance);
	} catch (err) {
		if (err.notFound) {
			default_response(req, res, 404, 'Address ' + req.params.address + ' not found');
		} else {
			throw err
		}
	}
}

async function get_balanceex(req, res) {
	ParameterCheck(req.params, 'address', "address");
	try {
		let addr_json = await req.db.get('ADDRESS:CURRENT:' + req.params.address, { asBuffer: false })
		let addr_info = JSON.parse(addr_json);
		default_response(req, res, 200, {
			mrc010: addr_info.balance,
			mrc402: addr_info.mrc402
		});
	} catch (err) {
		if (err.notFound) {
			default_response(req, res, 404, 'Address ' + req.params.address + ' not found');
		} else {
			throw err
		}
	}
}


function post_address(req, res) {
	if (req.body.publickey === undefined || req.body.publickey.length == 0) {
		default_response(req, res, 412, "Parameter publickey is missing");
		return;
	}

	http_request.post(config.MTCBridge + "/address",
		req.body,
		function (error, body) {
			if (error != null) {
				default_response(req, res, 412, "MTC Server connection error");
				return;
			}

			let data
			try {
				data = JSON.parse(body.text);
			} catch (e) {
				default_response(req, res, 500, "Server response error");
				return;
			}

			if (data.result != 'SUCCESS') {
				default_response(req, res, 412, data.msg);
			} else {
				default_response(req, res, 200, data.data);
			}
		});
}

async function get_address(req, res) {
	let return_value = [];
	for await (const [key, value] of req.db.iterator({
		gte: "ADDRESS:LOG:" + req.params.address + ":00000000000000000000000000000000",
		lte: "ADDRESS:LOG:" + req.params.address + ":99999999999999999999999999999999",
		limit: 50,
		reserve: true,
		keys: false,
		valueAsBuffer: false
	})) {
		return_value.push(value);
	}
	if (return_value.length > 0) {
		return_value.reverse();
		default_response(req, res, 200, return_value);
	} else {
		default_response(req, res, 404, 'Address ' + req.params.address + ' not found');
	}
}

async function post_address_by_key(req, res) {
	ParameterCheck(req.body, 'publickey');
	let fix_key = req.body.publickey.replace(/(\\n|\\r|\r|\n|-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----)/gm, "").trim();

	try {
		let addr_list = await req.db.get('ADDR_BY_PUBLICKEY:' + fix_key, { asBuffer: false })
		default_response(req, res, 200, JSON.parse(addr_list));
	} catch (err) {
		if (err.notFound) {
			default_response(req, res, 404, 'Address not found');
		} else {
			throw err
		}
	}
}

router.get('/getkey/:keytype/:address', get_nonce);
router.get('/nonce/:address', get_nonce);
router.get('/balance/:address', wrapRoute(get_balance));
router.get('/balanceex/:address', wrapRoute(get_balanceex));

router.get('/address/:address', wrapRoute(get_address));
router.post('/address', post_address);
router.post('/address/bykey', wrapRoute(post_address_by_key));

module.exports = router
