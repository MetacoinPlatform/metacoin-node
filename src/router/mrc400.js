const router = require('express').Router()
const config = require('../../config.json');

const { request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_txresponse_process,
    response } = require('../utils/lib.express')


/* ==================
        MRC400
   ================== */
function get_mrc400(req, res) {
    ParameterCheck(req.params, 'mrc400id');

    req.db.get('MRC400:DB:' + req.params.mrc400id)
        .then(function (value) {
            response(req, res, 200, value);
        })
        .catch(function (err) {
            response(req, res, 404, 'MRC400 ' + req.params.mrc400id + ' not found');
        });

}

function get_mrc401(req, res) {
    ParameterCheck(req.params, 'mrc401id');

    req.db.get('MRC401:DB:' + req.params.mrc401id)
        .then(function (value) {
            response(req, res, 200, value);
        })
        .catch(function (err) {
            response(req, res, 404, 'MRC401 ' + req.params.mrc031key + ' not found');
        });
}


function post_mrc400(req, res) {
    ParameterCheck(req.body, 'owner', "address");
    ParameterCheck(req.body, 'name', "string", false, 0, 128);
    ParameterCheck(req.body, 'url', "url", false, 1, 255);
    ParameterCheck(req.body, 'imageurl', "url", false, 1, 255);
    ParameterCheck(req.body, "allowtoken", "int", false, 1, 40);
    ParameterCheck(req.body, 'category', "string", false, 1, 64);
    ParameterCheck(req.body, 'description', "string", false, 1, 4096);
    ParameterCheck(req.body, 'itemurl', "url", false, 1, 255);
    ParameterCheck(req.body, 'itemimageurl', "url", false, 1, 255);
    ParameterCheck(req.body, 'data', "string", true, 1, 4096);
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc400",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response, "mrc400id"); });
}


function put_mrc400(req, res) {
    ParameterCheck(req.params, 'mrc400id');
    ParameterCheck(req.body, 'name', 'string', true, 0, 128);
    ParameterCheck(req.body, 'url', "url", 0, 255);
    ParameterCheck(req.body, 'imageurl', "url", 0, 255);
    ParameterCheck(req.body, "allowtoken", "int", 1, 40);
    ParameterCheck(req.body, 'category', 'string', true, 0, 64);
    ParameterCheck(req.body, 'description', 'string', true, 0, 4096);
    ParameterCheck(req.body, 'itemurl', "url", 0, 255);
    ParameterCheck(req.body, 'itemimageurl', "url", 0, 255);
    ParameterCheck(req.body, 'data', 'string', true, 0, 4096);
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.put(config.MTCBridge + "/mrc400/" + req.params.mrc400id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });

}

function post_mrc401(req, res) {
    ParameterCheck(req.params, 'mrc400id');
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc401/" + req.params.mrc400id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response) });
}


function put_mrc401_update(req, res) {
    ParameterCheck(req.params, 'mrc400id');
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.put(config.MTCBridge + "/mrc401/" + req.params.mrc400id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc401_transfer(req, res) {
    ParameterCheck(req.params, 'mrc401id');
    ParameterCheck(req.body, 'fromAddr', "address");
    ParameterCheck(req.body, 'toAddr', "address");
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc401/transfer/" + req.params.mrc401id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });

}


function post_mrc401_sell(req, res) {
    ParameterCheck(req.body, 'seller', "address");
    ParameterCheck(req.body, 'mrc400id');
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc401/sell",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });

}


function post_mrc401_unsell(req, res) {
    ParameterCheck(req.body, 'seller', "address");
    ParameterCheck(req.body, 'mrc400id');
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc401/unsell",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });

}

function post_mrc401_buy(req, res) {
    ParameterCheck(req.params, 'mrc401id');
    ParameterCheck(req.body, 'buyer', "address");
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc401/buy/" + req.params.mrc401id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });

}

function post_mrc401_auction(req, res) {
    ParameterCheck(req.body, 'seller', "address");
    ParameterCheck(req.body, 'mrc400id');
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc401/auction",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); })
}

function post_mrc401_unauction(req, res) {
    ParameterCheck(req.body, 'seller', "address");
    ParameterCheck(req.body, 'mrc400id');
    ParameterCheck(req.body, 'itemdata');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(
        config.MTCBridge + "/mrc401/unauction",
        function (err, response) { default_txresponse_process(err, req, res, response); }, req.body);
}

function get_mrc401_auctionfinish(req, res) {
    ParameterCheck(req.params, 'mrc401id');

    request.get(config.MTCBridge + "/mrc401/auctionfinish/" + req.params.mrc401id,
        function (err, response) { default_txresponse_process(err, req, res, response); });

}

function post_mrc401_bid(req, res) {
    ParameterCheck(req.params, 'mrc401id');
    ParameterCheck(req.body, 'buyer', "address");
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'token', "int");
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc401/bid/" + req.params.mrc401id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc401_melt(req, res) {
    ParameterCheck(req.params, 'mrc401id');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc401/melt/" + req.params.mrc401id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

// mrc400 - NFT project
router.get('/mrc400/:mrc400id', get_mrc400);
router.post('/mrc400', post_mrc400);
router.put('/mrc400/:mrc400id', put_mrc400);

// mrc401 - NFT
router.get('/mrc401/:mrc401id', get_mrc401);
router.post('/mrc401/transfer/:mrc401id', post_mrc401_transfer);
router.post('/mrc401/sell', post_mrc401_sell);
router.post('/mrc401/unsell', post_mrc401_unsell);
router.post('/mrc401/buy/:mrc401id', post_mrc401_buy);
router.post('/mrc401/melt/:mrc401id', post_mrc401_melt);
router.post('/mrc401/bid/:mrc401id', post_mrc401_bid);
router.post('/mrc401/auction', post_mrc401_auction);
router.post('/mrc401/unauction', post_mrc401_unauction);
router.get('/mrc401/auctionfinish/:mrc401id', get_mrc401_auctionfinish);
router.put('/mrc401/:mrc400id', put_mrc401_update);
router.post('/mrc401/:mrc400id', post_mrc401);

module.exports = router
