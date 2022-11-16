const router = require('express').Router()
const config = require('../../config.json');

const { request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_response_process,
    default_txresponse_process,
    response } = require('../utils/lib.express')

function get_mrc030(req, res) {
    req.db.get('MRC030:DB:' + req.params.mrc030key, { asBuffer: false }, (isError, value) => {
		if (isError) {
			response(req, res, 404, 'MRC030 ' + req.params.mrc030key + ' not found');
		} else {
			response(req, res, 200, value);
		}
	});
}


function get_mrc031(req, res) {
    req.db.get('MRC031:DB:' + req.params.mrc031key, { asBuffer: false }, (isError, value) => {
		if (isError) {
			response(req, res, 404, 'MRC031 ' + req.params.mrc031key + ' not found');
		} else {
			response(req, res, 200, value);
		}
	});
}


function post_mrc030(req, res) {
    ParameterCheck(req.body, 'owner', "address");
    ParameterCheck(req.body, 'title', "", false, 1, 256);
    ParameterCheck(req.body, 'description', "", false, 0, 2048);
    ParameterCheck(req.body, 'startdate', "int");
    ParameterCheck(req.body, 'enddate', "int");
    ParameterCheck(req.body, 'reward', "int", false, 1, 50);
    ParameterCheck(req.body, 'rewardtoken', "int", false, 1, 50);
    ParameterCheck(req.body, 'maxrewardrecipient', "int", false, 1, 50);
    ParameterCheck(req.body, 'rewardtype');
    ParameterCheck(req.body, 'url', "url");
    ParameterCheck(req.body, 'query');
    ParameterCheck(req.body, 'sign_need', "string", true);
    ParameterCheck(req.body, 'signature');
    ParameterCheck(req.body, 'tkey');

    request.post(config.MTCBridge + "/mrc030",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function post_mrc030_join(req, res, next) {
    res.header('Cache-Control', 'no-cache');
    ParameterCheck(req.body, "mrc030id");
    ParameterCheck(req.body, 'voter', "address");
    ParameterCheck(req.body, 'answer');
    ParameterCheck(req.body, 'voteCreatorSign', 'string', true);
    ParameterCheck(req.body, 'signature');

    request.post(config.MTCBridge + "/mrc030/join",
        req.body,
        function (err, response) { default_txresponse_process(err, req, res, response); });
}

function get_mrc030_finish(req, res) {
    request.get(config.MTCBridge + "/mrc030/finish/" + req.params.mrc030key,
        function (err, response) { default_response_process(err, req, res, response) });
}

// mrc030
router.get('/mrc030/:mrc030key', get_mrc030);
router.get('/mrc030/finish/:mrc030key', get_mrc030_finish);
router.post('/mrc030', post_mrc030);
router.post('/mrc030/:mrc030key', post_mrc030_join);
router.get('/mrc031/:mrc031key', get_mrc031);

module.exports = router
