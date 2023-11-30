const router = require('express').Router()
const config = require('../../config.json');

const { http_request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { wrapRoute,
    default_txresponse_process,
    default_response_process,
    default_response } = require('../utils/lib.express')

async function get_mrc400(req, res) {
    ParameterCheck(req.params, 'mrc400id');

    try {
        let mrc400_json = await req.db.get('MRC400:DB:' + req.params.mrc400id, { asBuffer: false })
        default_response(req, res, 200, mrc400_json);
    } catch (err) {
        if (err.notFound) {
            http_request.get(config.MTCBridge + "/mrc400/" + req.params.mrc400id,
                function (err, response) {
                    default_response_process(err, req, res, response, 'MRC400:DB:' + req.params.mrc400id)
                });
        } else {
            throw err
        }
    }
}

async function get_mrc401(req, res) {
    ParameterCheck(req.params, 'mrc401id');

    try {
        let mrc401_json = await req.db.get('MRC401:DB:' + req.params.mrc401id, { asBuffer: false })
        default_response(req, res, 200, mrc401_json);
    } catch (err) {
        if (err.notFound) {
            http_request.get(config.MTCBridge + "/mrc401/" + req.params.mrc401id,
                function (err, response) {
                    default_response_process(err, req, res, response, 'MRC401:DB:' + req.params.mrc401id)
                });
        } else {
            throw err
        }
    }
}

function post_mrc400(req, res) {
    ParameterCheck(req.body, 'owner', "address", false, 40, 40);
    ParameterCheck(req.body, 'name', "string", false, 1, 128);
    ParameterCheck(req.body, 'url', "url", false, 1, 1024);
    ParameterCheck(req.body, 'imageurl', "url", false, 1, 255);
    ParameterCheck(req.body, "allowtoken", "int", true, 1, 40);
    ParameterCheck(req.body, 'itemurl', "url", true, 1, 255);
    ParameterCheck(req.body, 'itemimageurl', "url", true, 1, 255);
    ParameterCheck(req.body, 'category', "string", true, 1, 64);
    ParameterCheck(req.body, 'description', "string", true, 1, 40960);
    ParameterCheck(req.body, 'socialmedia', "string", true, 1, 40960);
    ParameterCheck(req.body, 'partner', "string", true, 1, 4096);
    ParameterCheck(req.body, 'data', "string", true, 1, 40960);
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc400",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response, "mrc400id"); });
}


function put_mrc400(req, res) {
    ParameterCheck(req.params, 'mrc400id');
    ParameterCheck(req.body, 'name', "string", false, 0, 128);
    ParameterCheck(req.body, 'url', "url", false, 1, 1024);
    ParameterCheck(req.body, 'imageurl', "url", false, 1, 255);
    ParameterCheck(req.body, "allowtoken", "int", true, 1, 40);
    ParameterCheck(req.body, 'itemurl', "url", false, 0, 255);
    ParameterCheck(req.body, 'itemimageurl', "url", false, 0, 255);
    ParameterCheck(req.body, 'category', "string", false, 0, 64);
    ParameterCheck(req.body, 'description', "string", false, 0, 40960);
    ParameterCheck(req.body, 'socialmedia', "string", false, 0, 40960);
    ParameterCheck(req.body, 'partner', "string", false, 0, 4096);
    ParameterCheck(req.body, 'data', "string", false, 0, 40960);
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');
    http_request.put(config.MTCBridge + "/mrc400/" + req.params.mrc400id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc401(req, res) {
    ParameterCheck(req.params, 'mrc400id', 'string', false, 40, 40);
    ParameterCheck(req.body, 'creator', 'address', false, 40, 40);
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/" + req.params.mrc400id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response) });
}

function post_mrc401_createtrade(req, res) {
    ParameterCheck(req.params, 'mrc400id');
    ParameterCheck(req.body, 'creator', "address");
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'buyer', "address");
    ParameterCheck(req.body, 'price', "int");
    ParameterCheck(req.body, 'token', "int");

    ParameterCheck(req.body, 'platform_name', "string", true, 0, 255);
    ParameterCheck(req.body, 'platform_url', "url", true, 0, 255);
    ParameterCheck(req.body, 'platform_address', "address", true);
    ParameterCheck(req.body, 'platform_commission', "string", true, 0, 5);

    ParameterCheck(req.body, 'creatorSignature');
    ParameterCheck(req.body, 'creatorNonce');
    ParameterCheck(req.body, 'buyerSignature');
    ParameterCheck(req.body, 'buyerNonce');

    http_request.post(config.MTCBridge + "/mrc401/createtrade/" + req.params.mrc400id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}


function put_mrc401(req, res) {
    ParameterCheck(req.params, 'mrc400id');
    ParameterCheck(req.body, 'creator', 'string', false, 40, 40);
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.put(config.MTCBridge + "/mrc401/" + req.params.mrc400id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc401_transfer(req, res) {
    ParameterCheck(req.params, 'mrc401id');
    ParameterCheck(req.body, 'fromAddr', "address");
    ParameterCheck(req.body, 'toAddr', "address");
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/transfer/" + req.params.mrc401id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}


function post_mrc401_sell(req, res) {
    ParameterCheck(req.body, 'seller', "address");
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/sell",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}


function post_mrc401_unsell(req, res) {
    ParameterCheck(req.body, 'seller', "address");
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/unsell",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc401_buy(req, res) {
    ParameterCheck(req.params, 'mrc401id');
    ParameterCheck(req.body, 'buyer', "address");
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/buy/" + req.params.mrc401id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}


function post_mrc401_auction(req, res) {
    ParameterCheck(req.body, 'seller', "address");
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/auction",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); })
}

function post_mrc401_unauction(req, res) {
    console.log(req.body)
    ParameterCheck(req.body, 'seller', "address");
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/unauction",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function get_mrc401_auctionfinish(req, res) {
    ParameterCheck(req.params, 'mrc401id');

    http_request.get(config.MTCBridge + "/mrc401/auctionfinish/" + req.params.mrc401id,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc401_bid(req, res) {
    ParameterCheck(req.params, 'mrc401id');
    ParameterCheck(req.body, 'buyer', "address");
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/bid/" + req.params.mrc401id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc401_melt(req, res) {
    ParameterCheck(req.params, 'mrc401id');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc401/melt/" + req.params.mrc401id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

// mrc400 - NFT project
router.get('/mrc400/:mrc400id', wrapRoute(get_mrc400));
router.post('/mrc400', post_mrc400);
router.put('/mrc400/:mrc400id', put_mrc400);

// mrc401 - NFT
router.post('/mrc401/transfer/:mrc401id', post_mrc401_transfer);
router.post('/mrc401/sell', post_mrc401_sell);
router.post('/mrc401/unsell', post_mrc401_unsell);
router.post('/mrc401/buy/:mrc401id', post_mrc401_buy);
router.post('/mrc401/melt/:mrc401id', post_mrc401_melt);
router.post('/mrc401/bid/:mrc401id', post_mrc401_bid);
router.post('/mrc401/auction', post_mrc401_auction);
router.post('/mrc401/unauction', post_mrc401_unauction);
router.get('/mrc401/auctionfinish/:mrc401id', get_mrc401_auctionfinish);
router.post('/mrc401/createtrade/:mrc400id', post_mrc401_createtrade);

// general url
router.get('/mrc401/:mrc401id', wrapRoute(get_mrc401));
router.post('/mrc401/:mrc400id', post_mrc401);
router.put('/mrc401/:mrc400id', put_mrc401);

module.exports = router
