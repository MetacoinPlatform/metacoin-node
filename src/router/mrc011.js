const router = require('express').Router()
const config = require('../../config.json');

const { http_request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_response_process } = require('../utils/lib.express')

function get_mrc011(req, res) {
    ParameterCheck(req.params, 'mrc011key');

    http_request.put(config.MTCBridge + "/mrc011/" + req.params.mrc011key,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function post_mrc011(req, res) {
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'log');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc011/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function put_mrc011(req, res) {
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'log');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc011/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function get_mrc012(req, res) {
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'log');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc011/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function get_mrc012_sign(req, res) {
    ParameterCheck(req.params, 'mrc012_id');
    ParameterCheck(req.params, 'sign');

    http_request.post(config.MTCBridge + "/mrc011/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function post_mrc012(req, res) {
    ParameterCheck(req.params, 'mrc012_id');
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'log');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc011/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function put_mrc012(req, res) {
    ParameterCheck(req.params, 'mrc012_id');
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'log');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc011/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function delete_mrc012(req, res) {
    ParameterCheck(req.params, 'mrc012_id');
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'log');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc011/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

router.get('/mrc011/:mrc011key', get_mrc011);
router.post('/mrc011/:tkey', post_mrc011);
router.put('/mrc011/:tkey', put_mrc011);
router.get('/mrc012/:mrc012_id', get_mrc012);
router.get('/mrc012/:mrc012_id/:sign', get_mrc012_sign);
router.post('/mrc012/:mrc012_id/:tkey', post_mrc012);
router.put('/mrc012/:mrc012_id/:tkey', put_mrc012);
router.delete('/mrc012/:mrc012_id/:tkey', delete_mrc012);

module.exports = router
