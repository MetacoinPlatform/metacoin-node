const router = require('express').Router()

const { NumberPadding } = require('../utils/lib')
const { response } = require('../utils/lib.express')

function get_block_number(req, res) {
	req.db.get('STAT:DB:CURRENT_NUMBER', { asBuffer: false }, (isError, value) => {
		if (isError) {
			response(req, res, 200, "0");
		} else {
			response(req, res, 200, value);
		}
	});
}

function get_block(req, res) {
	function find(key) {
		req.db.get(key, { asBuffer: false }, (isError, value) => {
			if (isError) {
				response(req, res, 404, 'Block ' + req.params.block + ' not found');
			} else {
				response(req, res, 200, value);
			}
		});
	}

	if (req.params.block.length == 64) {
		find("DB:TX:" + req.params.block);
	} else {
		req.db.get('DB:SN:' + NumberPadding(req.params.block), { asBuffer: false }, (isError, value) => {
			if (isError) {
				response(req, res, 404, 'Block ' + req.params.block + ' not found');
			} else {
				find("DB:TX:" + value);
			}
		});
	}
}


function get_transaction(req, res) {
	req.db.get("TX:TX:" + req.params.transaction_id, { asBuffer: false }, (isError, value) => {
		if (isError) {
			response(req, res, 404, 'Transaction ' + req.params.block + ' not found');
		} else {
			response(req, res, 200, value);
		}
	});
}

// not chain code.
router.get('/block', get_block_number);
router.get('/block/:block', get_block);
router.get('/transaction/:transaction_id', get_transaction);

module.exports = router
