const router = require('express').Router()

const config = require('../../config.json');
const BigNumber = require('bignumber.js')

const { request } = require('../utils/lib.superagent')
const { logger } = require('../utils/lib.winston')

const { NumberPadding,
    ParameterCheck } = require('../utils/lib')
const { default_txresponse_process,
    default_response_process,
    response } = require('../utils/lib.express')

function get_token(req, res) {
    req.db.get('TOKEN:DB:' + NumberPadding(req.params.token_id))
        .then(function (value) {
            var data = JSON.parse(value);
            if (data.type == undefined || data.type == "") {
                data.type = "010";
            }
            data.circulation_supply = BigNumber(data.totalsupply);
            req.db.get('ADDRESS:CURRENT:' + data.owner)
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
                    var tx;
                    for (var t in a.balance) {
                        if (a.balance[t].token != req.params.token_id) {
                            continue;
                        }
                        try {
                            tx = BigNumber(a.balance[t].balance);
                        } catch (err) {
                            logger.error(err);
                            continue;
                        }
                        data.circulation_supply = data.circulation_supply.minus(tx);
                    }
                    response(req, res, 200, JSON.stringify(data));
                })
                .catch(function (err) {
                    logger.error(err);
                    response(req, res, 200, JSON.stringify(data));
                });
        })
        .catch(function (err) {
            logger.error(err);
            response(req, res, 404, 'Token ' + req.params.token_id + ' not found');
        });
}

function get_totalsupply(req, res) {
    req.db.get('TOKEN:DB:' + NumberPadding(req.params.token_id))
        .then(function (value) {
            var data = JSON.parse(value);
            if (data.type == undefined || data.type == "") {
                data.type = "010";
            }
            data.circulation_supply = BigNumber(data.totalsupply);
            req.db.get('ADDRESS:CURRENT:' + data.owner)
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
                    var tx;
                    for (var t in a.balance) {
                        if (a.balance[t].token != req.params.token_id) {
                            continue;
                        }
                        try {
                            tx = BigNumber(a.balance[t].balance);
                        } catch (err) {
                            logger.error(err);
                            continue;
                        }
                        data.circulation_supply = data.circulation_supply.minus(tx);
                    }
                    response(req, res, 200, "" + data.circulation_supply / Math.pow(10, data.decimal));
                })
                .catch(function (err) {
                    logger.error(err);
                    response(req, res, 200, JSON.stringify(data));
                });
        })
        .catch(function (err) {
            logger.error(err);
            response(req, res, 404, 'Token ' + req.params.token_id + ' not found');
        });
}

function post_token(req, res) {
    ParameterCheck(req.body, 'symbol');
    ParameterCheck(req.body, 'totalsupply', "int");
    ParameterCheck(req.body, 'name');
    ParameterCheck(req.body, 'owner', "address");

    var tier_sn = 1;
    if (req.body.tokenkey == undefined || req.body.tokenkey != 'INBLOCK_AUTH') {
        req.body.type = '010';
    }
    if (typeof req.body.tier == typeof []) {
        req.body.tier.forEach(function (tier) {
            tier.startdate = parseInt(tier.startdate);
            tier.enddate = parseInt(tier.enddate);
            tier.tiersn = parseInt(tier_sn);
            tier_sn = tier_sn + 1;
            if (tier.rate === undefined || tier.rate == '') {
                response(req, res, 412, 'Tier rate not defined');
            }
            tier.rate = parseInt(tier.rate);
            tier.unlockdate = parseInt(tier.unlockdate);
        });
    }
    if (typeof req.body.reserve == typeof []) {
        req.body.reserve.forEach(function (reserve) {
            reserve.unlockdate = parseInt(reserve.unlockdate);
        });
    }

    req.body.decimal = parseInt(req.body.decimal);
    request.post(config.MTCBridge + "/token",
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function post_token_save(req, res) {
    ParameterCheck(req.body, 'signature');
    request.post(config.MTCBridge + "/token/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}




function put_token(req, res) {
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.params, 'tkey');

    let params = {
        signature: req.body.signature,
        token: req.body.token,
        tkey: req.params.tkey
    };

    if (req.body['url'] !== undefined && req.body['url'].length > 0) {
        params['url'] = req.body.url;
    } else {
        params['url'] = "";
    }
    if (req.body['info'] !== undefined && req.body['info'].length > 0) {
        params['info'] = req.body.info;
    } else {
        params['info'] = "";
    }
    if (req.body['image'] !== undefined && req.body['image'].length > 0) {
        params['image'] = req.body.image;
    } else {
        params['image'] = "";
    }

    request.put(config.MTCBridge + "/token/update/" + req.params.tkey,
        params,
        function (err, response) { default_response_process(err, req, res, response) });
}


function post_token_burn(req, res) {
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'amount');
    ParameterCheck(req.body, 'memo', "string", true);
    ParameterCheck(req.params, 'tkey');

    request.put(config.MTCBridge + "/token/burn/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function post_token_increase(req, res) {
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'amount');
    ParameterCheck(req.body, 'memo', "string", true);
    ParameterCheck(req.params, 'tkey');

    request.put(config.MTCBridge + "/token/increase/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function post_transfer(req, res) {
    ParameterCheck(req.body, 'from', "address");
    ParameterCheck(req.body, 'to', "address");
    ParameterCheck(req.body, 'token', "int");
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'checkkey');
    ParameterCheck(req.body, 'signature');

    if (req.body.unlockdate === undefined) {
        req.body.unlockdate = 0;
    }
    request.post(config.MTCBridge + "/transfer",
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function post_multitransfer(req, res, next) {
    res.header('Cache-Control', 'no-cache');

    ParameterCheck(req.body, 'from', "address");
    ParameterCheck(req.body, 'transferlist');
    ParameterCheck(req.body, 'token', "int");
    ParameterCheck(req.body, 'checkkey');
    ParameterCheck(req.body, 'signature');

    var data = "";
    try {
        data = JSON.parse(req.body.transferlist);
    } catch (e) {
        return next(new Error('The transferlist must be a json encoded array'));
    }

    if (Array.isArray(data) == false) {
        return next(new Error('The transferlist must be a json encoded array'));
    }
    if (data.length > 100) {
        return next(new Error('There must be no more than 100 recipients of multitransfer'));
    }

    for (var key in data) {
        ParameterCheck(data[key], 'address', "address");
        ParameterCheck(data[key], 'amount', 'int', false, 1, 99);
        ParameterCheck(data[key], 'unlockdate', 'int');

        if (req.body.from == data[key].address) {
            return next(new Error('The from address and to addressare the same.'));
        }
    }

    request.post(config.MTCBridge + "/multitransfer",
        req.body,
        function (err, response) { default_response_process(err, req, res, response,) });
}
function post_exchange(req, res) {
    ParameterCheck(req.body, 'fromAddr');
    ParameterCheck(req.body, 'fromAmount');
    ParameterCheck(req.body, 'fromToken');
    ParameterCheck(req.body, 'fromFeesendto');
    ParameterCheck(req.body, 'fromFeeamount');
    ParameterCheck(req.body, 'fromFeetoken');
    ParameterCheck(req.body, 'fromTag');
    ParameterCheck(req.body, 'fromMemo');
    ParameterCheck(req.body, 'fromSign');
    ParameterCheck(req.params, 'fromTkey');
    ParameterCheck(req.body, 'toAddr');
    ParameterCheck(req.body, 'toAmount');
    ParameterCheck(req.body, 'toToken');
    ParameterCheck(req.body, 'toFeesendto');
    ParameterCheck(req.body, 'toFeeamount');
    ParameterCheck(req.body, 'toFeetoken');
    ParameterCheck(req.body, 'toTag');
    ParameterCheck(req.body, 'toMemo');
    ParameterCheck(req.body, 'toSign');
    ParameterCheck(req.params, 'toTkey');

    request.post(config.MTCBridge + "/exchange/" + req.params.fromTkey + "/" + req.params.toTkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function get_mrc010_dex(req, res) {
    ParameterCheck(req.params, 'mrc010dexid');
    req.db.get('MRC010DEX:DB:' + req.params.mrc010dexid)
        .then(function (value) {
            response(req, res, 200, value);
        })
        .catch(function (err) {
            response(req, res, 404, 'MRC010DEX ' + req.params.mrc010dexid + ' not found');
        });
}

function post_token_sell(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'token', "int");
    ParameterCheck(req.body, 'price', "int");
    ParameterCheck(req.body, 'platform_name', "string", true, 0, 255);
    ParameterCheck(req.body, 'platform_url', "url", true, 0, 255);
    ParameterCheck(req.body, 'platform_address', "address", true);
    ParameterCheck(req.body, 'platform_commission', "string", true, 0, 5);
    ParameterCheck(req.body, 'min_trade_unit', "int", true, 1, 100000000);
    
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/token/sell/" + req.params.mrc010id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response, "mrc010dexid"); });
}

function post_token_unsell(req, res) {
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/token/unsell/" + req.params.mrc010dexid,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_token_buy(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/token/buy/" + req.params.mrc010dexid,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_token_reqsell(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'token', "int");
    ParameterCheck(req.body, 'price', "int");
    ParameterCheck(req.body, 'platform_name', "string", true, 0, 255);
    ParameterCheck(req.body, 'platform_url', "url", true, 0, 255);
    ParameterCheck(req.body, 'platform_address', "address", true);
    ParameterCheck(req.body, 'platform_commission', "string", true, 0, 5);
    ParameterCheck(req.body, 'min_trade_unit', "int", true, 1, 100000000);

    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/token/reqsell/" + req.params.mrc010id,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response, "mrc010dexid"); });
}

function post_token_unreqsell(req, res) {
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/token/unreqsell/" + req.params.mrc010dexid,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_token_acceptreqsell(req, res) {
    ParameterCheck(req.body, 'address', 'address');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'amount', "int");
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/token/acceptreqsell/" + req.params.mrc010dexid,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

// token
router.get('/token/:token_id', get_token);
router.get('/totalsupply/:token_id', get_totalsupply);
router.post('/token', post_token);
router.put('/token/update/:tkey', put_token);
router.post('/token/:tkey', post_token_save);
router.put('/token/burn/:tkey', post_token_burn);
router.put('/token/increase/:tkey', post_token_increase);

// dex
router.post('/token/sell/:mrc010id', post_token_sell);
router.post('/token/unsell/:mrc010dexid', post_token_unsell);
router.post('/token/buy/:mrc010dexid', post_token_buy);

router.post('/token/reqsell/:mrc010id', post_token_reqsell);
router.post('/token/unreqsell/:mrc010dexid', post_token_unreqsell);
router.post('/token/acceptreqsell/:mrc010dexid', post_token_acceptreqsell);

router.get('/token/dex/:mrc010dexid', get_mrc010_dex);

// transfer and exchange
router.post('/transfer', post_transfer);
router.post('/multitransfer', post_multitransfer);
router.post('/exchange/:fromTkey/:toTkey', post_exchange);


module.exports = router
