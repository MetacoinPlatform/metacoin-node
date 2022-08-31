const router = require('express').Router()

const { NumberPadding } = require('../utils/lib')
const { response } = require('../utils/lib.express')

function get_block_number(req, res) {
	req.db.get('STAT:DB:CURRENT_NUMBER')
		.then(function (value) {
			response(req, res, 200, value);
		})
		.catch(function (err) {
			response(req, res, 200, "0");
		});
}

function get_block(req, res) {
	function find(key) {
		req.db.get(key)
			.then(function (value) {
				response(req, res, 200, value);
			})
			.catch(function (err) {
				response(req, res, 404, 'Block ' + req.params.block + ' not found');
			});
	}

	if (req.params.block.length == 64) {
		find("DB:TX:" + req.params.block);
	} else {
		req.db.get('DB:SN:' + NumberPadding(req.params.block))
			.then(function (value) {
				find("DB:TX:" + value);
			})
			.catch(function (err) {
				response(req, res, 404, 'Block ' + req.params.block + ' not found');
			});
	}
}


function get_transaction(req, res) {
	req.db.get("TX:TX:" + req.params.transaction_id)
		.then(function (value) {
			response(req, res, 200, value.toString());
		})
		.catch(function (err) {
			response(req, res, 404, 'Transaction ' + req.params.block + ' not found');
		});
}

// not chain code.
router.get('/block', get_block_number);
router.get('/block/:block', get_block);
router.get('/transaction/:transaction_id', get_transaction);

module.exports = router
