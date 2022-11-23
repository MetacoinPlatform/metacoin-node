const router = require('express').Router()
const config = require('../../config.json');

const { http_request } = require('../utils/lib.superagent')
const { NumberPadding, ParameterCheck } = require('../utils/lib')
const { wrapRoute,
	default_response,
	default_response_process } = require('../utils/lib.express')

async function get_block_number(req, res) {
	try {
		let db_number = await req.db.get('STAT:DB:CURRENT_NUMBER', { asBuffer: false })
		default_response(req, res, 200, db_number);
	} catch (e) {
		default_response(req, res, 200, "0");
	}
}

async function get_block(req, res) {
	let db_id = "";
	if (req.params.block.length == 64) {
		db_id = req.params.block
	} else {
		if (isNaN(Number(req.params.block))) {
			default_response(req, res, 404, 'Block is must be numeric or 64 bytes id');
			return;
		}
		try {
			db_id = await req.db.get('DB:SN:' + NumberPadding(req.params.block), { asBuffer: false })
		} catch (e) {
			if (err.notFound) {
				default_response(req, res, 404, 'Block ' + req.params.block + ' not found');
				return
			} else {
				throw err
			}
		}
	}

	try {
		let db = await req.db.get("DB:TX:" + db_id, { asBuffer: false })
		default_response(req, res, 200, db);
	} catch (err) {
		if (err.notFound) {
			default_response(req, res, 404, 'Block ' + req.params.block + ' not found');
		} else {
			throw err
		}
	}
}

async function get_transaction(req, res) {
	ParameterCheck(req.params, 'transaction_id');
	try {
		let tx = await req.db.get("TX:TX:" + req.params.transaction_id, { asBuffer: false })
		default_response(req, res, 200, tx);
	} catch (e) {
		http_request.get(config.MTCBridge + "/transaction/" + req.params.transaction_id, function (err, response) {
			if (err) {
				default_response(req, res, 404, 'Transaction ' + req.params.transaction_id + ' not found');
			} else {
				default_response_process(err, req, res, response, 'TX:TX:' + req.params.transaction_id)
			}
		});
	}
}

// not chain code.
router.get('/block', wrapRoute(get_block_number));
router.get('/block/:block', wrapRoute(get_block));
router.get('/transaction/:transaction_id', wrapRoute(get_transaction));

module.exports = router
