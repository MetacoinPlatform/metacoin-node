/* jshint esversion: 6 */
/* jshint node: true */
"use strict";

const app_ver = "v1.0";
const app_title = "MetaCoin MainNode";
const listen_port = 20922;
const config  = require('./config.json');

console.log(app_title + " " + app_ver);

var max_db_number = 1;

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const rocks = require('level-rocksdb');

const requestModule = require('request');
const request = requestModule.defaults();

var createServer = require("auto-sni");



const app = express();
const multer = require('multer'),
	upload = multer();

const db = rocks(config.DB_PATH, { createIfMissing: true });

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


function NumberPadding(a){
	return ("0000000000000000" + a).substr(-16);
}

function ParameterCheck(v, n) {
	if(v[n] === undefined || v[n].length == 0){
		return true;
	}
	return false;
}

function getTransactions(tx_id, db_id, db_sn, tx_idx) {
	request.get(config.MTCBridge + "/transaction/"+tx_id, function(error, response, body){
		if(error != null) {
			return;
		}
		var data = JSON.parse(body);
		if(data == null || data.result == undefined || data.result != 'SUCCESS') {
			return;
		}

		var save_data = [];

		data.data.forEach(function(d){
			d.db_id = db_id;
			d.db_sn = db_sn;
			switch (d.type){
				case "NewWallet":
				case "transfer":
					d.values.tx_id = tx_id;
					d.values.db_sn = db_sn;
					d.values.db_id = db_id;
					save_data.push({type:'put', key:"ADDRESS:CURRENT:"+d.parameters[0], value: JSON.stringify(d.values)});
					save_data.push({type:'put', key:"ADDRESS:LOG:"+d.parameters[0] + ":" + NumberPadding(db_sn) + NumberPadding(tx_idx) , value: JSON.stringify(d.values)});
					break;
				case "stodexRegister":
				case "stodexUnRegister":
				case "stodexExchangePending":
				case "stodexExchangeRequest":
					d.values.tx_id = tx_id;
					d.values.db_sn = db_sn;
					d.values.db_id = db_id;

					if(d.type == "stodexExchangeRequest"){
						save_data.push({type:'put', key:"ADDRESS:CURRENT:"+d.parameters[1], value: JSON.stringify(d.values)});
						save_data.push({type:'put', key:"ADDRESS:LOG:"+d.parameters[1] + ":" + NumberPadding(db_sn) + NumberPadding(tx_idx) , value: JSON.stringify(d.values)});
					} else {
						save_data.push({type:'put', key:"ADDRESS:CURRENT:"+d.parameters[0], value: JSON.stringify(d.values)});
						save_data.push({type:'put', key:"ADDRESS:LOG:"+d.parameters[0] + ":" + NumberPadding(db_sn) + NumberPadding(tx_idx) , value: JSON.stringify(d.values)});
					}
					break;

				case "receive":
				case "token_reserve":
					d.values.tx_id = tx_id;
					d.values.db_sn = db_sn;
					d.values.db_id = db_id;
					save_data.push({type:'put', key:"ADDRESS:CURRENT:"+d.parameters[1], value: JSON.stringify(d.values)});
					save_data.push({type:'put', key:"ADDRESS:LOG:"+d.parameters[1] + ":" + NumberPadding(db_sn) + NumberPadding(tx_idx) , value: JSON.stringify(d.values)});
					break;
				case "tokenRegister":
					if(d.parameters.token == undefined){
						d.parameters.token = 0;
					}
					if(d.parameters.type == undefined || d.parameters.type == ""){
						d.parameters.type = "010";
					}
					save_data.push({type:'put', key:"TOKEN:DB:"+NumberPadding(d.parameters.token), value: JSON.stringify(d.parameters)});
					break;

			}
		});
		save_data.push({type:'put', key:"TX:TX:"+data.data[0].id, value: JSON.stringify(data.data)})
		db.batch(save_data)
		.then(function(){
			console.log('Transaction save ' + data.data[0].id + ', ' + db_id + ', ' + db_sn);})
		.catch(function(err){
			console.error('Transaction save ERROR!!! [' + data.data[0].id + '] ' + err.message);
		});
	});
}

function getFabricBlock() {
	request.get(config.MTCBridge + "/block/"+max_db_number, function(error, response, body){
		if(error != null) {
			console.log(new Date().toString() + error);
			setTimeout(getFabricBlock, 1000);
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			return;
		}
		if(data == null || data.result == undefined || data.result != 'SUCCESS') {
			setTimeout(getFabricBlock, 1000);
			return;
		}
		var save_data = [];
		var tx_idx = 0;
		data.data.transaction.forEach(function(tx) {
			tx_idx = tx_idx + 1;
			getTransactions(tx.id, data.data.id, data.data.sn, tx_idx);
		});
		save_data.push({type:'put', key:"DB:TX:"+data.data.id, value: JSON.stringify(data.data)});
		save_data.push({type:'put', key:"DB:SN:"+NumberPadding(data.data.sn), value: data.data.id});
		save_data.push({type:'put', key:'STAT:DB:CURRENT_NUMBER', value: max_db_number});

		db.batch(save_data)
		.then(function(){
			console.log('Block [' + data.data.sn+ '] save ');
			max_db_number = max_db_number + 1;
			setImmediate(getFabricBlock);
		})
		.catch(function(err){
			console.log('Block [' + max_db_number + '] save error' + err);
			setImmediate(getFabricBlock);
		});
	});
}

function post_address(req, res){
	if(req.body.publickey === undefined || req.body.publickey.length == 0){
		res.status(412).send("Parameter publickey is missing");
		return;
	}

	request.post({url:config.MTCBridge + "/address", form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data = JSON.parse(body);
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		} else {
			res.send(data.data);
		}
	});
}

function get_address(req, res){
	var return_value = [];
	db.createReadStream({
		gte : "ADDRESS:LOG:"+req.params.address + ":00000000000000000000000000000000",
		lte :"ADDRESS:LOG:"+req.params.address + ":99999999999999999999999999999999" })
	.on('data', function (data) {
		return_value.push(data.value);
	})
	.on('error', function (err) {
		res.status(400).send(err.message);
	})
	.on('end', function () {
		if(return_value.length > 0)  {
			return_value.reverse();
			res.send(return_value);
		} else {
			res.status(404).send('Address '+req.params.address+' not found');
		}
	});
}

function get_balance(req, res){
	db.get('ADDRESS:CURRENT:' + req.params.address)
	.then(function(value){
		var a = JSON.parse(value);
		for(var k in a.pending){
			a.balance.push({balance:"0",token:k,unlockdate:"0",pending:a.pending[k]});
		}
		res.send(a.balance);
	})
	.catch(function(err){
		res.status(404).send(err, res, 'Address '+req.params.address+' not found');
	});
}

function get_block_number(req, res) {
	db.get('STAT:DB:CURRENT_NUMBER')
	.then(function(value){
		res.send(value);})
	.catch(function(err){
		res.send("0");
	});
}

function get_block(req, res) {
	function find(key){
		db.get(key)
		.then (function(value){
			res.send(value);
		})
		.catch(function (err) {
			res.status(404).send(err, res, 'Block ' + req.params.block + ' not found');
		});
	}

	if(req.params.block.length == 64) {
		find("DB:TX:"+req.params.block);
	} else {
		db.get('DB:SN:' + NumberPadding(req.params.block))
		.then(function(value){
			find("DB:TX:"+value);})
		.catch(function (err) {
			res.status(404).send(err, res, 'Block ' + req.params.block + ' not found');
		});
	}
}

function get_token(req, res) {
	db.get('TOKEN:DB:' + NumberPadding(req.params.token_id))
	.then (function(value){
		var data = JSON.parse(value);
		if(data.type == undefined || data.type == ""){
			data.type = "010";
		}
		res.send(JSON.stringify(data));
	})
	.catch(function (err) {
		res.status(404).send(err, res, 'Token ' + req.params.token_id + ' not found');
	});
}

function get_mrc020(req, res){
	request.get({url:config.MTCBridge + "/mrc020/" + req.params.mrc020key}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}
		var data = JSON.parse(body);
		if(data == null || data.result == undefined){
			res.status(412).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}




function post_mrc020(req, res){
	ParameterCheck(req.body, 'owner');
	ParameterCheck(req.body, 'algorithm');
	ParameterCheck(req.body, 'data');
	ParameterCheck(req.body, 'publickey');
	ParameterCheck(req.body, 'opendate');
	ParameterCheck(req.body, 'referencekey');
	ParameterCheck(req.body, 'signature');

	if(req.body.data.length > 2048){
		res.status(400).send('data is too long');
		return;
	}

	if(req.body.referencekey.length > 64){
		res.status(400).send('referencekey is too long');
		return;
	}

	if (!/[^a-zA-Z0-9]/.test(req.body.referencekey)) {
    	res.status(400).send('Reference key is a-z, A-Z, 0-9 only');
	    return;
	}

	if(req.body.algorithm.length > 64){
		res.status(400).send('algorithm is too long');
		return;
	}

	let now = Math.round(new Date().getTime()/1000);
	let opendate = parseInt(req.body.opendate);
	if (opendate == NaN){
		res.status(400).send('The opendate value is not unix timesamp');
		return;
	}

	if ((opendate - now) <= 0) {
		res.status(400).send('The opendate value is not a future');
		return;
	}

	if ((opendate - now) > 3600){
		res.status(400).send('The opendate value is not within one hour.');
		return;
	}

	request.post({url:config.MTCBridge + "/mrc020", form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}


function post_token(req, res){
	ParameterCheck(req.body, 'symbol');
	ParameterCheck(req.body, 'totalsupply');
	ParameterCheck(req.body, 'name');
	ParameterCheck(req.body, 'owner');

	var tier_sn = 1;
	req.body.type = '010';
	if(typeof req.body.tier == typeof []){
		req.body.tier.forEach(function (tier) {
			tier.startdate = parseInt(tier.startdate);
			tier.enddate = parseInt(tier.enddate);
			tier.tiersn = parseInt(tier_sn);
			tier_sn = tier_sn + 1;
			if(tier.rate === undefined || tier.rate == ''){
				res.status(412).send('Tier rate not defined');
			}
			tier.rate = parseInt(tier.rate);
			tier.unlockdate = parseInt(tier.unlockdate);
		});
	}
	if(typeof req.body.reserve== typeof []){
		req.body.reserve.forEach(function (reserve) {
			reserve.unlockdate= parseInt(reserve.unlockdate);
		});
	}

	req.body.decimal = parseInt(req.body.decimal);
	request.post({url:config.MTCBridge + "/token", form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}


function post_token_save(req, res){
	ParameterCheck(req.body, 'signature');
	request.post({url:config.MTCBridge + "/token/" + req.params.tkey, form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}

function get_transaction(req, res) {
	db.get("TX:TX:" + req.params.transaction_id)
	.then (function(value){
		res.send(value.toString());})
	.catch(function (err) {
		res.status(404).send(err, res, 'Transaction ' + req.params.block + ' not found');
	});
}

function post_transaction  (req, res) {
	if(req.body.from === undefined || req.body.from.length == 0) {
		res.status(412).send("Parameter from is missing");
		return;
	}
	if(req.body.to === undefined || req.body.to.length == 0) {
		res.status(412).send("Parameter from is missing");
		return;
	}
	if(req.body.token === undefined || req.body.token.length == 0) {
		res.status(412).send("Parameter token is missing");
		return;
	}
	if(req.body.amount === undefined || req.body.amount.length == 0) {
		res.status(412).send("Parameter amount is missing");
		return;
	}
	if(req.body.checkkey === undefined || req.body.checkkey.length == 0) {
		res.status(412).send("Parameter checkkey is missing");
		return;
	}
	if(req.body.signature === undefined || req.body.signature.length == 0) {
		res.status(412).send("Parameter signature is missing");
		return;
	}

	if(req.body.unlockdate === undefined) {
		req.body.unlockdate = 0;
	}


	request.post({url:config.MTCBridge + "/transfer", form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data = JSON.parse(body);
		if(data == null || data.result == undefined){
			res.status(404).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(404).send(data.msg);
			return;
		}

		res.send(data.data);
	});
}

function get_key(req, res){
	if(req.params.address.length == 0){
		res.status(412).send("Parameter address is missing");
		return;
	}

	request.get(config.MTCBridge + "/getkey/"+req.params.keytype+'/'+req.params.address, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}
		var data = JSON.parse(body);
		if(data == null || data.result == undefined){
			res.status(412).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}

function post_tokenupdate_tokenbase(req, res){
	ParameterCheck(req.body, 'signature');
	ParameterCheck(req.params, 'tkey');
	ParameterCheck(req.params, 'tokenID');
	ParameterCheck(req.params, 'baseTokenID');

	request.post({url:config.MTCBridge + "/tokenUpdate/TokenBase/" + req.params.tkey + '/' + req.params.tokenID + '/' + req.params.baseTokenID, form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send({error:data.msg});
			return;
		}
		res.send(data.data);
	});
}
function post_tokenupdate_tokentargetadd(req, res){
	ParameterCheck(req.body, 'signature');

	ParameterCheck(req.params, 'tkey');
	ParameterCheck(req.params, 'tokenID');
	ParameterCheck(req.params, 'targetTokenID');
	request.post({url:config.MTCBridge + "/tokenUpdate/TokenTargetAdd/" + req.params.tkey + '/' + req.params.tokenID + '/' + req.params.targetTokenID, form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}

function post_tokenupdate_tokentargetremove(req, res){
	ParameterCheck(req.body, 'signature');

	ParameterCheck(req.params, 'tkey');
	ParameterCheck(req.params, 'tokenID');
	ParameterCheck(req.params, 'targetTokenID');

	request.post({url:config.MTCBridge + "/tokenUpdate/TokenTargetRemove/" + req.params.tkey + '/' + req.params.tokenID + '/' + req.params.targetTokenID, form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}


function post_mrc040_create(req, res){
	ParameterCheck(req.body, 'owner');
	ParameterCheck(req.body, 'side');
	ParameterCheck(req.body, 'basetoken');
	ParameterCheck(req.body, 'targettoken');
	ParameterCheck(req.body, 'price');
	ParameterCheck(req.body, 'qtt');
	ParameterCheck(req.body, 'signature');
	request.post({url:config.MTCBridge + "/mrc040/create/" + req.params.tkey, form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send({txid:data.data, mrc040id:data.msg});
	});
}


function post_mrc040_cancel(req, res){
	ParameterCheck(req.body, 'owner');
	ParameterCheck(req.body, 'mrc040id');
	ParameterCheck(req.body, 'signature');

	request.post({url:config.MTCBridge + "/mrc040/cancel/" + req.params.tkey, form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}


function post_mrc040_exchange(req, res){
	ParameterCheck(req.body, 'requester');
	ParameterCheck(req.body, 'mrc040id');
	ParameterCheck(req.body, 'qtt');
	ParameterCheck(req.body, 'signature');

	request.post({url:config.MTCBridge + "/mrc040/exchange/" + req.params.tkey, form:req.body}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}

		var data;
		try{
			data = JSON.parse(body);
		} catch(err){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data == null || data.result == undefined){
			res.status(400).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}

function get_mrc040(req, res){
	request.get({url:config.MTCBridge + "/mrc040/" + req.params.mrc040key}, function(error, response, body){
		if(error != null){
			res.status(412).send("MTC Server connection error");
			return;
		}
		var data = JSON.parse(body);
		if(data == null || data.result == undefined){
			res.status(412).send('MTC Main node response error');
			return;
		}
		if(data.result != 'SUCCESS') {
			res.status(412).send(data.msg);
			return;
		}
		res.send(data.data);
	});
}


app.get('/address/:address',get_address);
app.get('/balance/:address',get_balance);
app.get('/block', get_block_number);
app.get('/block/:block', get_block);
app.get('/token/:token_id', get_token);
app.get('/transaction/:transaction_id', get_transaction);
app.get('/getkey/:keytype/:address', get_key);

app.post('/address', upload.array(), post_address);
app.post('/token', upload.array(), post_token);
app.post('/mrc020', upload.array(), post_mrc020);
app.get('/mrc020/:mrc020key', upload.array(), get_mrc020);
app.get('/mrc040/:mrc040key', upload.array(), get_mrc040);
app.post('/token/:tkey', upload.array(), post_token_save);
app.post('/transfer', upload.array(), post_transaction);
app.post('/tokenUpdate/TokenBase/:tkey/:tokenID/:baseTokenID', upload.array(), post_tokenupdate_tokenbase);
app.post('/tokenUpdate/TokenTargetAdd/:tkey/:tokenID/:targetTokenID', upload.array(), post_tokenupdate_tokentargetadd);
app.post('/tokenUpdate/TokenTargetRemove/:tkey/:tokenID/:targetTokenID', upload.array(), post_tokenupdate_tokentargetremove);

app.post('/mrc040/create/:tkey', upload.array(), post_mrc040_create);
app.post('/mrc040/cancel/:tkey', upload.array(), post_mrc040_cancel);
app.post('/mrc040/exchange/:tkey', upload.array(), post_mrc040_exchange);

/* for debug code */
app.get('/get/:a', function(req, res){
	db.get(req.params.a, function (err, value) {
		if(err){
			res.send(err);
		} else {
			res.send(value.toString());
		}
	});
});

app.get('/set/:a/:b', function(req, res){
	db.put(req.params.a, req.params.b, function (err) {
		res.json({});
	});
});

app.use(function(req, res, next){
	res.header('Access-Control-Allow-Origin', '*');
	res.header('X-METACOIN-NODE', app_ver);
	next();
});

app.use(function(error, req, res, next) {
	if( error.message.indexOf('not found') > -1){
		res.status(404).send(message);
	} else {
		res.status(412).send(error.message);
	}
});



try{
	db.open(function(){
		db.get('STAT:DB:CURRENT_NUMBER').then(function(value){
			max_db_number = parseInt(value);
			max_db_number = max_db_number + 1;
			getFabricBlock();
		}).catch(function (err) {
			console.error(err);
			max_db_number = 1;
			getFabricBlock();
		});
	});
	createServer({
		email: 'leslie@inblock.co', // Emailed when certificates expire.
		agreeTos: true, // Required for letsencrypt.
		debug: false, // Add console messages and uses staging LetsEncrypt server. (Disable in production)
		store: require('greenlock-store-fs'),
		domains: ["rest.metacoin.network"], // List of accepted domain names. (You can use nested arrays to register bundles with LE).
		dir: "/home/MTCNode/letsencrypt/etc", // Directory for storing certificates. Defaults to "~/letsencrypt/etc" if not present.
		ports: { https: 20923 }
	  }, app);
	http.createServer(app).listen(listen_port, function() {
		console.log(app_title + ' listening on port ' + listen_port);
	});
} catch(err){
	console.log(err)
	console.error(app_title + ' port ' + listen_port + ' bind error');
}
