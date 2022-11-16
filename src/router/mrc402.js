const router = require('express').Router()
const config = require('../../config.json');

const {request} = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_txresponse_process,
    response } = require('../utils/lib.express')

function get_mrc402(req, res) {
    ParameterCheck(req.params, 'mrc402id');
    req.db.get('MRC402:DB:' + req.params.mrc402id, { asBuffer: false }, (isError, value) => {
        if (isError) {
            response(req, res, 404, 'MRC402 ' + req.params.mrc400id + ' not found');
        } else {
            response(req, res, 200, value);
        }
    });
}

function get_mrc402_dex(req, res) {
    ParameterCheck(req.params, 'mrc402dexid');
    req.db.get('MRC402DEX:DB:' + req.params.mrc402dexid, { asBuffer: false }, (isError, value) => {
        if (isError) {
            response(req, res, 404, 'MRC402DEX ' + req.params.mrc402dexid + ' not found');
        } else {
            response(req, res, 200, value);
        }
    });
}

function post_mrc402(req, res) {
    ParameterCheck(req.body, 'name', "string", false, 1, 128);
    ParameterCheck(req.body, 'creator', "address");
    ParameterCheck(req.body, 'creatorcommission');
    ParameterCheck(req.body, 'totalsupply', "int", false, 1, 8);
    ParameterCheck(req.body, 'decimal', "int", false, 1, 1);
    ParameterCheck(req.body, 'url', "url", false, 1, 255);
    ParameterCheck(req.body, 'imageurl', "url", false, 1, 255);
    ParameterCheck(req.body, "shareholder", "string", true, 1, 1024);
    ParameterCheck(req.body, "initialreserve", "string", true, 1, 1024);
    ParameterCheck(req.body, "expiredate", "int", true, 0, 12);
    ParameterCheck(req.body, 'data', "string", true, 0, 40960);
    ParameterCheck(req.body, 'information', "string", true, 0, 40960);
    ParameterCheck(req.body, 'socialmedia', "string", true, 0, 40960);
    ParameterCheck(req.body, 'copyright_registration_country', "string", true, 0, 2);
    ParameterCheck(req.body, 'copyright_registrar', "string", true, 0, 128);
    ParameterCheck(req.body, 'copyright_registration_number', "string", true, 0, 64);
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response, "mrc402id"); });
}


function post_mrc402_transfer(req, res) {
    ParameterCheck(req.body, 'fromAddr', "address");
    ParameterCheck(req.body, 'toAddr', "address");
    ParameterCheck(req.body, 'amount');
    ParameterCheck(req.body, 'tag');
    ParameterCheck(req.body, 'memo');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402/transfer/" + req.params.mrc402id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}


function put_mrc402(req, res) {
    ParameterCheck(req.body, 'url', "url", false, 1, 255);
    ParameterCheck(req.body, 'data', "string", true, 0, 40960);
    ParameterCheck(req.body, 'information', "string", true, 0, 40960);
    ParameterCheck(req.body, 'socialmedia', "string", true, 0, 40960);
    ParameterCheck(req.body, 'copyright_registration_country', "string", true, 0, 2);
    ParameterCheck(req.body, 'copyright_registrar', "string", true, 0, 128);
    ParameterCheck(req.body, 'copyright_registration_number', "string", true, 0, 64);
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.put(config.MTCBridge + "/mrc402/update/" + req.params.mrc402id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function put_mrc402_mint(req, res) {
    ParameterCheck(req.body, 'amount');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'memo', "string", true, 0, 1024);
    ParameterCheck(req.body, 'tkey');

    request.put(config.MTCBridge + "/mrc402/mint/" + req.params.mrc402id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}


function put_mrc402_burn(req, res) {
    ParameterCheck(req.body, 'amount');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'memo', "string", true, 0, 1024);
    ParameterCheck(req.body, 'tkey');

    request.put(config.MTCBridge + "/mrc402/burn/" + req.params.mrc402id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc402_melt(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'amount');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402/melt/" + req.params.mrc402id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc402_sell(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'token', "int");
    ParameterCheck(req.body, 'price', "int");
    ParameterCheck(req.body, 'platform_name', "string", true, 0, 255);
    ParameterCheck(req.body, 'platform_url', "url", true, 0, 255);
    ParameterCheck(req.body, 'platform_address', "address", true);
    ParameterCheck(req.body, 'platform_commission', "string", true, 0, 5);

    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402/sell/" + req.params.mrc402id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response, "mrc402dexid"); });
}

function post_mrc402_unsell(req, res) {
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402/unsell/" + req.params.mrc402dexid,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc402_buy(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402/buy/" + req.params.mrc402dexid,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc402_auction(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'auction_start_price', "int");
    ParameterCheck(req.body, 'token', "int");
    ParameterCheck(req.body, 'auction_bidding_unit', "int");
    ParameterCheck(req.body, 'auction_buynow_price', "string", true);
    ParameterCheck(req.body, 'auction_start_date', "int", true);
    ParameterCheck(req.body, 'auction_end_date', "int", true);
    ParameterCheck(req.body, 'platform_name', "string", true, 0, 255);
    ParameterCheck(req.body, 'platform_url', "url", true, 0, 255);
    ParameterCheck(req.body, 'platform_address', "address", true);
    ParameterCheck(req.body, 'platform_commission', "string", true, 0, 5);
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402/auction/" + req.params.mrc402id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response, "mrc402dexid"); })
}

function post_mrc402_unauction(req, res) {
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402/unauction/" + req.params.mrc402dexid,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc402_bid(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'amount');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc402/bid/" + req.params.mrc402dexid,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function get_mrc402_auctionfinish(req, res) {
    request.get(config.MTCBridge + "/mrc402/auctionfinish/" + req.params.mrc402dexid,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

// mrc402 - A token called NFT
router.get('/mrc402/:mrc402id', get_mrc402);
router.post('/mrc402', post_mrc402);
router.post('/mrc402/transfer/:mrc402id', post_mrc402_transfer);
router.put('/mrc402/update/:mrc402id', put_mrc402);
router.put('/mrc402/mint/:mrc402id', put_mrc402_mint);
router.put('/mrc402/burn/:mrc402id', put_mrc402_burn);
router.post('/mrc402/melt/:mrc402id', post_mrc402_melt);

router.get('/mrc402/dex/:mrc402dexid', get_mrc402_dex);
router.post('/mrc402/sell/:mrc402id', post_mrc402_sell);
router.post('/mrc402/unsell/:mrc402dexid', post_mrc402_unsell);
router.post('/mrc402/buy/:mrc402dexid', post_mrc402_buy);
router.post('/mrc402/bid/:mrc402dexid', post_mrc402_bid);
router.post('/mrc402/auction/:mrc402id', post_mrc402_auction);
router.post('/mrc402/unauction/:mrc402dexid', post_mrc402_unauction);
router.get('/mrc402/auctionfinish/:mrc402dexid', get_mrc402_auctionfinish);

module.exports = router
