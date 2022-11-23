
const router = require('express').Router()
const config = require('../../config.json');

const { http_request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_response_process } = require('../utils/lib.express')


function post_mrc100_payment(req, res) {
    ParameterCheck(req.body, 'to');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'tag');
    ParameterCheck(req.body, 'userlist');
    ParameterCheck(req.body, 'gameid');
    ParameterCheck(req.body, 'gamememo');

    http_request.post(config.MTCBridge + "/mrc100/payment",
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function post_mrc100_reward(req, res) {
    ParameterCheck(req.body, 'from');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'userlist');
    ParameterCheck(req.body, 'gameid');
    ParameterCheck(req.body, 'gamememo');
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    http_request.post(config.MTCBridge + "/mrc100/reward",
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function post_mrc100_log(req, res) {
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'logger');
    ParameterCheck(req.body, 'log');
    ParameterCheck(req.body, 'logger');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc100/log/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}


function get_mrc100_log(req, res) {
    http_request.get(config.MTCBridge + "/mrc100/log/" + req.params.mrc100key,
        function (err, response) { default_response_process(err, req, res, response) });
}

function get_mrc100_logger(req, res) {
    ParameterCheck(req.params, 'token');

    http_request.get(config.MTCBridge + "/mrc100/logger/" + req.params.token,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function post_mrc100_logger(req, res) {
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'address');
    ParameterCheck(req.body, 'signature');

    http_request.post(config.MTCBridge + "/mrc100/logger/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function delete_mrc100_logger(req, res) {
    ParameterCheck(req.params, 'tkey');
    ParameterCheck(req.body, 'token');
    ParameterCheck(req.body, 'address');
    ParameterCheck(req.body, 'signature');

    http_request.delete(config.MTCBridge + "/mrc100/logger/" + req.params.tkey,
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

// mrc100
router.post('/mrc100/payment', post_mrc100_payment);
router.post('/mrc100/reward', post_mrc100_reward);
router.post('/mrc100/log/:tkey', post_mrc100_log);
router.get('/mrc100/log/:mrc100key', get_mrc100_log);
router.get('/mrc100/logger/:token', get_mrc100_logger);
router.post('/mrc100/logger/:tkey', post_mrc100_logger);
router.delete('/mrc100/logger/:tkey', delete_mrc100_logger);

module.exports = router