const router = require('express').Router()
const config = require('../../config.json');

const { http_request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_response_process,
    default_txresponse_process } = require('../utils/lib.express')

function post_tokenupdate_tokenbase(req, res) {
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.params, 'token');
    ParameterCheck(req.params, 'baseToken');

    http_request.post(config.MTCBridge + "/tokenUpdate/TokenBase/" + req.params.tkey + '/' + req.params.token + '/' + req.params.baseToken,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function post_tokenupdate_tokentargetadd(req, res) {
    ParameterCheck(req.body, 'signature');

    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.params, 'token');
    ParameterCheck(req.params, 'targetToken');
    http_request.post(config.MTCBridge + "/tokenUpdate/TokenTargetAdd/" + req.params.tkey + '/' + req.params.token + '/' + req.params.targetToken,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function post_tokenupdate_tokentargetremove(req, res) {
    ParameterCheck(req.body, 'signature');

    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.params, 'token');
    ParameterCheck(req.params, 'targetToken');

    http_request.post(config.MTCBridge + "/tokenUpdate/TokenTargetRemove/" + req.params.tkey + '/' + req.params.token + '/' + req.params.targetToken,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function post_mrc040_create(req, res) {
    ParameterCheck(req.body, 'owner', "address");
    ParameterCheck(req.body, 'side');
    ParameterCheck(req.body, 'basetoken');
    ParameterCheck(req.body, 'targettoken');
    ParameterCheck(req.body, 'price', 'int');
    ParameterCheck(req.body, 'qtt', 'int');
    ParameterCheck(req.body, 'signature');
    http_request.post(config.MTCBridge + "/mrc040/create/" + req.params.tkey,
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response, "mrc040id"); });
}


function post_mrc040_cancel(req, res) {
    ParameterCheck(req.body, 'owner', "address");
    ParameterCheck(req.body, 'mrc040id');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc040/cancel/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function post_mrc040_exchange(req, res) {
    ParameterCheck(req.body, 'requester');
    ParameterCheck(req.body, 'mrc040id');
    ParameterCheck(req.body, 'qtt', "int");
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc040/exchange/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function get_mrc040(req, res) {
    http_request
        .get(config.MTCBridge + "/mrc040/" + req.params.mrc040key,
            function (err, response) { default_response_process(err, req, res, response) });
}

// mrc040
router.get('/mrc040/:mrc040key', get_mrc040);
router.post('/mrc040/create/:tkey', post_mrc040_create);
router.post('/mrc040/cancel/:tkey', post_mrc040_cancel);
router.post('/mrc040/exchange/:tkey', post_mrc040_exchange);

// token update for mrc040
router.post('/tokenUpdate/TokenBase/:tkey/:token/:baseToken', post_tokenupdate_tokenbase);
router.post('/tokenUpdate/TokenTargetAdd/:tkey/:token/:targetToken', post_tokenupdate_tokentargetadd);
router.post('/tokenUpdate/TokenTargetRemove/:tkey/:token/:targetToken', post_tokenupdate_tokentargetremove);

module.exports = router
