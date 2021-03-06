/* jshint esversion: 6 */
/* jshint node: true */
"use strict";

const app_ver = "ver 2.1.0";
const app_title = "MetaCoin node";
const config = require('./config.json');
const mtcUtil = require("./mtcUtil");
console.log(app_title + " " + app_ver);

var max_db_number = 1;

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const rocks = require('level-rocksdb');
const BigNumber = require('bignumber.js');

const requestModule = require('request');
const request = requestModule.defaults({
    timeout: 10000
    //	proxy: 'http://192.168.10.2:8888'
});

const app = express();

app.use(function (req, res, next) {
    res.header('X-METACOIN-NODE', app_ver);
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(new Date().toTimeString(), ip.replace('::ffff:', ''), '\t', req.method, '\t', req.url);
    next();
});

app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
}));
app.disable('x-powered-by');


const multer = require('multer'),
    upload = multer();

const db = rocks(config.DB_PATH, {
    createIfMissing: true
});


function getTransactions(tx_id, db_id, db_sn, tx_idx) {
    request.get(config.MTCBridge + "/transaction/" + tx_id, function (error, response, body) {
        if (error != null) {
            return;
        }
        let data = JSON.parse(body);
        if (data == null || data.result == undefined || data.result != 'SUCCESS') {
            return;
        }

        let save_data = [];
        let save_addr = ""

        data.data.forEach(function (d) {
            d.db_id = db_id;
            d.db_sn = db_sn;
            save_addr = "";
            if (d.validationCode != 0) {
                console.log(d);
                return;
            }
            console.log(db_id, db_sn, tx_id, d.type);
            switch (d.type) {
                case "Chaincode Install or Update":
                    break;
                case "NewWallet":
                    var fix_key = d.parameters[1].replace(/(\r\n|\n|\r|-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----)/gm, "").trim();
                    db.get('ADDR_BY_PUBLICKEY:' + fix_key)
                    .then(function (value) {
                        var a = JSON.parse(value);
                        a.push(d.parameters[0]);
                        db.put('ADDR_BY_PUBLICKEY:' + fix_key,JSON.stringify(a));
                    })
                    .catch(function (err) {
                        db.put('ADDR_BY_PUBLICKEY:' + fix_key, JSON.stringify([d.parameters[0]]));
                    });
                case "transfer":
                case "multi_transfer":
                case "stodexRegister":
                case "mrc030create":
                    d.values.tx_id = tx_id;
                    d.values.db_sn = db_sn;
                    d.values.db_id = db_id;
                    save_addr = d.parameters[0];
                    break;
                case "stodexRegister":
                case "stodexUnRegister":
                case "stodexExchangePending":
                case "stodexExchangeRequest":
                    d.values.tx_id = tx_id;
                    d.values.db_sn = db_sn;
                    d.values.db_id = db_id;

                    if (d.type == "stodexExchangeRequest") {
                        save_addr = d.parameters[1];
                    } else {
                        save_addr = d.parameters[0];
                    }
                    break;
                case "receive":
                case "token_reserve":
                case "mrc030reward":
                case "mrc030refund":
                    d.values.tx_id = tx_id;
                    d.values.db_sn = db_sn;
                    d.values.db_id = db_id;
                    save_addr = d.parameters[1];
                    break;
                case "tokenRemoveLogger":
                case "tokenAddLogger":
                case "tokenBurning":
                case "tokenUpdate":
                case "tokenIncrease":
                    save_data.push({
                        type: 'put',
                        key: "TOKEN:DB:" + mtcUtil.NumberPadding(d.parameters[0]),
                        value: JSON.stringify(d.values)
                    });
                    break;
                case "tokenRegister":
                    save_data.push({
                        type: 'put',
                        key: "TOKEN:DB:" + mtcUtil.NumberPadding(d.parameters.token),
                        value: JSON.stringify(d.parameters)
                    });
                    break;
                case "exchange":
                    save_addr = d.parameters[0];
                    break;
                case "exchangePair":
                    save_addr = d.parameters[9];
                    break;
                case "exchangeFee":
                    save_addr = d.parameters[3];
                    break;
                case "exchangeFeePair":
                    save_addr = d.parameters[12];
                    break;
                case "mrc100payment":
                case "mrc100paymentrecv":
                case "ownerBurning":
                case "ownerIncrease":
                    save_addr = d.address;
                    break;
                case "mrc030":
                case "mrc030update":
                case "mrc030finish":
                    save_data.push({
                        type: 'put',
                        key: "MRC030:DB:" + d.parameters[1],
                        value: JSON.stringify(d.values)
                    });
                    break;
                case "mrc031":
                    save_data.push({
                        type: 'put',
                        key: "MRC031:DB:" + d.parameters[0] + "_" + d.parameters[1],
                        value: JSON.stringify(d.values)
                    });
                    break;
                default:
                    console.log(d.type, d);
            }

            if (save_addr != "") {
                save_data.push({
                    type: 'put',
                    key: "ADDRESS:CURRENT:" + save_addr,
                    value: JSON.stringify(d.values)
                });
                save_data.push({
                    type: 'put',
                    key: "ADDRESS:LOG:" + save_addr + ":" + mtcUtil.NumberPadding(db_sn) + mtcUtil.NumberPadding(tx_idx),
                    value: JSON.stringify(d.values)
                });
            }

        });
        save_data.push({
            type: 'put',
            key: "TX:TX:" + data.data[0].id,
            value: JSON.stringify(data.data)
        })
        db.batch(save_data)
            .then(function () {
                console.log('Transaction save ' + data.data[0].id + ', ' + db_id + ', ' + db_sn);
            })
            .catch(function (err) {
                console.error('Transaction save ERROR!!! [' + data.data[0].id + '] ' + err.message);
            });
    });
}

function getFabricBlock() {
    request.get(config.MTCBridge + "/block/" + max_db_number, function (error, response, body) {
        if (error != null) {
            console.log(new Date().toString() + error);
            setTimeout(getFabricBlock, 1000);
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            return;
        }
        if (data == null || data.result == undefined || data.result != 'SUCCESS') {
            setTimeout(getFabricBlock, 1000);
            return;
        }
        var save_data = [];
        var tx_idx = 0;
        data.data.transaction.forEach(function (tx) {
            tx_idx = tx_idx + 1;
            getTransactions(tx.id, data.data.id, data.data.sn, tx_idx);
        });
        save_data.push({
            type: 'put',
            key: "DB:TX:" + data.data.id,
            value: JSON.stringify(data.data)
        });
        save_data.push({
            type: 'put',
            key: "DB:SN:" + mtcUtil.NumberPadding(data.data.sn),
            value: data.data.id
        });
        save_data.push({
            type: 'put',
            key: 'STAT:DB:CURRENT_NUMBER',
            value: max_db_number
        });

        db.batch(save_data)
            .then(function () {
                console.log('Block [' + data.data.sn + '] save ', tx_idx);
                max_db_number = max_db_number + 1;
                setImmediate(getFabricBlock);
            })
            .catch(function (err) {
                console.log('Block [' + max_db_number + '] save error' + err);
                setImmediate(getFabricBlock);
            });
    });
}

function post_address(req, res) {
    if (req.body.publickey === undefined || req.body.publickey.length == 0) {
        res.status(412).send("Parameter publickey is missing");
        return;
    }

    request.post({
        url: config.MTCBridge + "/address",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data = JSON.parse(body);
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        } else {
            res.send(data.data);
        }
    });
}

function get_address(req, res) {
    var return_value = [];
    db.createReadStream({
        gte: "ADDRESS:LOG:" + req.params.address + ":00000000000000000000000000000000",
        lte: "ADDRESS:LOG:" + req.params.address + ":99999999999999999999999999999999",
	limit: 50,
	reserve: true
    })
        .on('data', function (data) {
            return_value.push(data.value);
        })
        .on('error', function (err) {
            res.status(400).send(err.message);
        })
        .on('end', function () {
            if (return_value.length > 0) {
                return_value.reverse();
                res.send(return_value);
            } else {
                res.status(404).send('Address ' + req.params.address + ' not found');
            }
        });
}

function get_balance(req, res) {
    db.get('ADDRESS:CURRENT:' + req.params.address)
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
            res.send(a.balance);
        })
        .catch(function (err) {
            res.status(404).send(err, res, 'Address ' + req.params.address + ' not found');
        });
}

function get_block_number(req, res) {
    db.get('STAT:DB:CURRENT_NUMBER')
        .then(function (value) {
            res.send(value);
        })
        .catch(function (err) {
            res.send("0");
        });
}

function get_block(req, res) {
    function find(key) {
        db.get(key)
            .then(function (value) {
                res.send(value);
            })
            .catch(function (err) {
                res.status(404).send(err, res, 'Block ' + req.params.block + ' not found');
            });
    }

    if (req.params.block.length == 64) {
        find("DB:TX:" + req.params.block);
    } else {
        db.get('DB:SN:' + mtcUtil.NumberPadding(req.params.block))
            .then(function (value) {
                find("DB:TX:" + value);
            })
            .catch(function (err) {
                res.status(404).send(err, res, 'Block ' + req.params.block + ' not found');
            });
    }
}

function get_token(req, res) {
    db.get('TOKEN:DB:' + mtcUtil.NumberPadding(req.params.token_id))
        .then(function (value) {
            var data = JSON.parse(value);
            if (data.type == undefined || data.type == "") {
                data.type = "010";
            }
            data.circulation_supply = BigNumber(data.totalsupply);
            db.get('ADDRESS:CURRENT:' + data.owner)
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
                        } catch (e) {
                            console.log(e);
                            continue;
                        }
                        data.circulation_supply = data.circulation_supply.minus(tx);
                    }
                    res.send(JSON.stringify(data));
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(JSON.stringify(data));
                });
        })
        .catch(function (err) {
            console.log(err);
            res.status(404).send(err, res, 'Token ' + req.params.token_id + ' not found');
        });
}

function get_totalsupply(req, res) {
    db.get('TOKEN:DB:' + mtcUtil.NumberPadding(req.params.token_id))
        .then(function (value) {
            var data = JSON.parse(value);
            if (data.type == undefined || data.type == "") {
                data.type = "010";
            }
            data.circulation_supply = BigNumber(data.totalsupply);
            db.get('ADDRESS:CURRENT:' + data.owner)
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
                        } catch (e) {
                            console.log(e);
                            continue;
                        }
                        data.circulation_supply = data.circulation_supply.minus(tx);
                    }
		    res.send(""+data.circulation_supply/Math.pow(10, data.decimal));
                })
                .catch(function (err) {
                    console.log(err);
                    res.send(JSON.stringify(data));
                });
        })
        .catch(function (err) {
            console.log(err);
            res.status(404).send(err, res, 'Token ' + req.params.token_id + ' not found');
        });
}
function get_mrc020(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip, req.url);
    request.get({
        url: config.MTCBridge + "/mrc020/" + req.params.mrc020key
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }
        var data = JSON.parse(body);
        if (data == null || data.result == undefined) {
            res.status(412).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_mrc020(req, res) {
    mtcUtil.ParameterCheck(req.body, 'owner');
    mtcUtil.ParameterCheck(req.body, 'algorithm');
    mtcUtil.ParameterCheck(req.body, 'data');
    mtcUtil.ParameterCheck(req.body, 'publickey');
    mtcUtil.ParameterCheck(req.body, 'opendate');
    mtcUtil.ParameterCheck(req.body, 'referencekey');
    mtcUtil.ParameterCheck(req.body, 'signature');

    if (req.body.data.length > 2048) {
        res.status(400).send('data is too long');
        return;
    }

    if (req.body.referencekey.length > 64) {
        res.status(400).send('referencekey is too long');
        return;
    }

    if (!/[^a-zA-Z0-9]/.test(req.body.referencekey)) {
        res.status(400).send('Reference key is a-z, A-Z, 0-9 only');
        return;
    }

    if (req.body.algorithm.length > 64) {
        res.status(400).send('algorithm is too long');
        return;
    }

    let now = Math.round(new Date().getTime() / 1000);
    let opendate = parseInt(req.body.opendate);
    if (opendate == NaN) {
        res.status(400).send('The opendate value is not unix timesamp');
        return;
    }

    if ((opendate - now) <= 0) {
        res.status(400).send('The opendate value is not a future');
        return;
    }

    if ((opendate - now) > 3600) {
        res.status(400).send('The opendate value is not within one hour.');
        return;
    }

    request.post({
        url: config.MTCBridge + "/mrc020",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function get_mrc030(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip, req.url);
    db.get('MRC030:DB:' + req.params.mrc030key)
        .then(function (value) {
            res.send(value);
        })
        .catch(function (err) {
            res.status(404).send(err, res, 'MRC030 ' + req.params.mrc030key + ' not found');
        });
}


function get_mrc031(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip, req.url);
    db.get('MRC031:DB:' + req.params.mrc031key)
        .then(function (value) {
            res.send(value);
        })
        .catch(function (err) {
            res.status(404).send(err, res, 'MRC031 ' + req.params.mrc031key + ' not found');
        });
}


function post_mrc030(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip, req.url);
    mtcUtil.ParameterCheck(req.body, 'owner', "address");
    mtcUtil.ParameterCheck(req.body, 'title', "", 1, 256);
    mtcUtil.ParameterCheck(req.body, 'description', "", 0, 2048);
    mtcUtil.ParameterCheck(req.body, 'startdate', "int");
    mtcUtil.ParameterCheck(req.body, 'enddate', "int");
    mtcUtil.ParameterCheck(req.body, 'reward', "int", 1, 50);
    mtcUtil.ParameterCheck(req.body, 'rewardtoken', "int", 1, 50);
    mtcUtil.ParameterCheck(req.body, 'maxrewardrecipient', "int", 1, 50);
    mtcUtil.ParameterCheck(req.body, 'rewardtype');
    mtcUtil.ParameterCheck(req.body, 'url', "url");
    mtcUtil.ParameterCheck(req.body, 'query');
    mtcUtil.ParameterCheck(req.body, 'sign_need', 'option');
    mtcUtil.ParameterCheck(req.body, 'signature');
    mtcUtil.ParameterCheck(req.body, 'tkey');

    request.post({
        url: config.MTCBridge + "/mrc030",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }
        var data = JSON.parse(body);
        if (data == null || data.result == undefined) {
            res.status(412).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function post_mrc030_join(req, res, next) {
    res.header('Cache-Control', 'no-cache');
    mtcUtil.ParameterCheck(req.body, "mrc030id");
    mtcUtil.ParameterCheck(req.body, 'voter', "address");
    mtcUtil.ParameterCheck(req.body, 'answer');
    mtcUtil.ParameterCheck(req.body, 'voteCreatorSign', 'option');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc030/join",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }
        var data = JSON.parse(body);
        if (data == null || data.result == undefined) {
            res.status(412).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function get_mrc030_finish(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip, req.url);
    request.get({
        url: config.MTCBridge + "/mrc030/finish/" + req.params.mrc030key
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }
        var data = JSON.parse(body);
        if (data == null || data.result == undefined) {
            res.status(412).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_token(req, res) {
    mtcUtil.ParameterCheck(req.body, 'symbol');
    mtcUtil.ParameterCheck(req.body, 'totalsupply', "int");
    mtcUtil.ParameterCheck(req.body, 'name');
    mtcUtil.ParameterCheck(req.body, 'owner', "address");

    var tier_sn = 1;
    if (req.body.tokenkey == undefined || req.body.tokenkey != 'INBLOCK_AUTH') {
        //	req.body.type = '010';
    }
    if (typeof req.body.tier == typeof []) {
        req.body.tier.forEach(function (tier) {
            tier.startdate = parseInt(tier.startdate);
            tier.enddate = parseInt(tier.enddate);
            tier.tiersn = parseInt(tier_sn);
            tier_sn = tier_sn + 1;
            if (tier.rate === undefined || tier.rate == '') {
                res.status(412).send('Tier rate not defined');
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
    request.post({
        url: config.MTCBridge + "/token",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_token_save(req, res) {
    mtcUtil.ParameterCheck(req.body, 'signature');
    request.post({
        url: config.MTCBridge + "/token/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            console.log(err);
            res.status(400).send('MTC Main node response error 1');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error 2');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function get_transaction(req, res) {
    db.get("TX:TX:" + req.params.transaction_id)
        .then(function (value) {
            res.send(value.toString());
        })
        .catch(function (err) {
            res.status(404).send(err, res, 'Transaction ' + req.params.block + ' not found');
        });
}


function post_transfer(req, res) {

    if (req.body.from === undefined || req.body.from.length == 0) {
        res.status(412).send("Parameter from is missing");
        return;
    }
    if (req.body.to === undefined || req.body.to.length == 0) {
        res.status(412).send("Parameter from is missing");
        return;
    }
    if (req.body.token === undefined || req.body.token.length == 0) {
        res.status(412).send("Parameter token is missing");
        return;
    }
    if (req.body.amount === undefined || req.body.amount.length == 0) {
        res.status(412).send("Parameter amount is missing");
        return;
    }
    if (req.body.checkkey === undefined || req.body.checkkey.length == 0) {
        res.status(412).send("Parameter checkkey is missing");
        return;
    }
    if (req.body.signature === undefined || req.body.signature.length == 0) {
        res.status(412).send("Parameter signature is missing");
        return;
    }

    if (req.body.unlockdate === undefined) {
        req.body.unlockdate = 0;
    }


    request.post({
        url: config.MTCBridge + "/transfer",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        try {
            var data = JSON.parse(body);
        } catch (err) {
            console.log(err);
            res.status(404).send(err.message);

        }
        if (data == null || data.result == undefined) {
            res.status(404).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(404).send(data.msg);
            return;
        }

        res.send(data.data);
    });
}



function post_multitransfer(req, res, next) {
    res.header('Cache-Control', 'no-cache');
    var data = "";
    // req.body.unlockdate = "0";
    mtcUtil.ParameterCheck(req.body, 'from', "address");
    mtcUtil.ParameterCheck(req.body, 'transferlist');
    mtcUtil.ParameterCheck(req.body, 'token', "int");
    mtcUtil.ParameterCheck(req.body, 'checkkey');
    mtcUtil.ParameterCheck(req.body, 'signature');

    try{
        data = JSON.parse(req.body.transferlist);
    } catch (e) {
        return next(new Error('The transferlist must be a json encoded array'));
    }

    if (Array.isArray(data) == false){
        return next(new Error('The transferlist must be a json encoded array'));
    }
    if (data.length > 100 ){
        return next(new Error('There must be no more than 100 recipients of multitransfer'));
    }

    for (var key in data){
        mtcUtil.ParameterCheck(data[key], 'address', "address");
        mtcUtil.ParameterCheck(data[key], 'amount', 'int', 1, 99);
        mtcUtil.ParameterCheck(data[key], 'unlockdate', 'int');

        if (req.body.from == data[key].address) {
            return next(new Error('The from address and to addressare the same.'));
        }
    }

    request.post({
        url: config.MTCBridge + "/multitransfer",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        try {
            var data = JSON.parse(body);
        } catch (err) {
            console.log(err);
            res.status(404).send(err.message);

        }
        if (data == null || data.result == undefined) {
            res.status(404).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(404).send(data.msg);
            return;
        }

        res.send(data.data);
    });
}



function get_key(req, res) {
    if (req.params.address.length == 0) {
        res.status(412).send("Parameter address is missing");
        return;
    }

    let allowkey = {
        'transfer': 1,
        'token': 1,
        'dapp': 1,
        'exchange': 1,
        'mrc020': 1,
        'mrc030': 1,
        'mrc040': 1,
        'mrc100': 1,
    }
    if (allowkey[req.params.keytype] == undefined) {
        res.status(412).send("Key type unknown");
        return;
    }

    request.get(config.MTCBridge + "/getkey/" + req.params.keytype + '/' + req.params.address, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }
        var data = JSON.parse(body);
        if (data == null || data.result == undefined) {
            res.status(412).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function post_tokenupdate_tokenbase(req, res) {
    mtcUtil.ParameterCheck(req.body, 'signature');
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.params, 'token');
    mtcUtil.ParameterCheck(req.params, 'baseToken');

    request.post({
        url: config.MTCBridge + "/tokenUpdate/TokenBase/" + req.params.tkey + '/' + req.params.token + '/' + req.params.baseToken,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send({
                error: data.msg
            });
            return;
        }
        res.send(data.data);
    });
}

function post_tokenupdate_tokentargetadd(req, res) {
    mtcUtil.ParameterCheck(req.body, 'signature');

    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.params, 'token');
    mtcUtil.ParameterCheck(req.params, 'targetToken');
    request.post({
        url: config.MTCBridge + "/tokenUpdate/TokenTargetAdd/" + req.params.tkey + '/' + req.params.token + '/' + req.params.targetToken,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function post_tokenupdate_tokentargetremove(req, res) {
    mtcUtil.ParameterCheck(req.body, 'signature');

    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.params, 'token');
    mtcUtil.ParameterCheck(req.params, 'targetToken');

    request.post({
        url: config.MTCBridge + "/tokenUpdate/TokenTargetRemove/" + req.params.tkey + '/' + req.params.token + '/' + req.params.targetToken,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_mrc040_create(req, res) {
    mtcUtil.ParameterCheck(req.body, 'owner');
    mtcUtil.ParameterCheck(req.body, 'side');
    mtcUtil.ParameterCheck(req.body, 'basetoken');
    mtcUtil.ParameterCheck(req.body, 'targettoken');
    mtcUtil.ParameterCheck(req.body, 'price');
    mtcUtil.ParameterCheck(req.body, 'qtt');
    mtcUtil.ParameterCheck(req.body, 'signature');
    request.post({
        url: config.MTCBridge + "/mrc040/create/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send({
            txid: data.data,
            mrc040id: data.msg
        });
    });
}


function post_mrc040_cancel(req, res) {
    mtcUtil.ParameterCheck(req.body, 'owner');
    mtcUtil.ParameterCheck(req.body, 'mrc040id');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc040/cancel/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_mrc040_exchange(req, res) {
    mtcUtil.ParameterCheck(req.body, 'requester');
    mtcUtil.ParameterCheck(req.body, 'mrc040id');
    mtcUtil.ParameterCheck(req.body, 'qtt');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc040/exchange/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function get_mrc040(req, res) {
    request.get({
        url: config.MTCBridge + "/mrc040/" + req.params.mrc040key
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }
        var data = JSON.parse(body);
        if (data == null || data.result == undefined) {
            res.status(412).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_exchange(req, res) {
    mtcUtil.ParameterCheck(req.body, 'fromAddr');
    mtcUtil.ParameterCheck(req.body, 'fromAmount');
    mtcUtil.ParameterCheck(req.body, 'fromToken');
    mtcUtil.ParameterCheck(req.body, 'fromFeesendto');
    mtcUtil.ParameterCheck(req.body, 'fromFeeamount');
    mtcUtil.ParameterCheck(req.body, 'fromFeetoken');
    mtcUtil.ParameterCheck(req.body, 'fromTag');
    mtcUtil.ParameterCheck(req.body, 'fromMemo');
    mtcUtil.ParameterCheck(req.body, 'fromSign');
    mtcUtil.ParameterCheck(req.params, 'fromTkey');
    mtcUtil.ParameterCheck(req.body, 'toAddr');
    mtcUtil.ParameterCheck(req.body, 'toAmount');
    mtcUtil.ParameterCheck(req.body, 'toToken');
    mtcUtil.ParameterCheck(req.body, 'toFeesendto');
    mtcUtil.ParameterCheck(req.body, 'toFeeamount');
    mtcUtil.ParameterCheck(req.body, 'toFeetoken');
    mtcUtil.ParameterCheck(req.body, 'toTag');
    mtcUtil.ParameterCheck(req.body, 'toMemo');
    mtcUtil.ParameterCheck(req.body, 'toSign');
    mtcUtil.ParameterCheck(req.params, 'toTkey');

    request.post({
        url: config.MTCBridge + "/exchange/" + req.params.fromTkey + "/" + req.params.toTkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function put_token(req, res) {
    mtcUtil.ParameterCheck(req.body, 'signature');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.params, 'tkey');

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

    request.put({
        url: config.MTCBridge + "/token/update/" + req.params.tkey,
        form: params
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_token_burn(req, res) {
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'signature');
    mtcUtil.ParameterCheck(req.body, 'amount');
    mtcUtil.ParameterCheck(req.params, 'tkey');

    request.put({
        url: config.MTCBridge + "/token/burn/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_token_increase(req, res) {
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'signature');
    mtcUtil.ParameterCheck(req.body, 'amount');
    mtcUtil.ParameterCheck(req.params, 'tkey');

    request.put({
        url: config.MTCBridge + "/token/increase/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function post_mrc100_payment(req, res) {
    mtcUtil.ParameterCheck(req.body, 'to');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'tag');
    mtcUtil.ParameterCheck(req.body, 'userlist');
    mtcUtil.ParameterCheck(req.body, 'gameid');
    mtcUtil.ParameterCheck(req.body, 'gamememo');

    request.post({
        url: config.MTCBridge + "/mrc100/payment",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function post_mrc100_reward(req, res) {
    mtcUtil.ParameterCheck(req.body, 'from');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'userlist');
    mtcUtil.ParameterCheck(req.body, 'gameid');
    mtcUtil.ParameterCheck(req.body, 'gamememo');
    mtcUtil.ParameterCheck(req.body, 'signature');
    mtcUtil.ParameterCheck(req.body, 'tkey');

    request.post({
        url: config.MTCBridge + "/mrc100/reward",
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_mrc100_log(req, res) {
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'logger');
    mtcUtil.ParameterCheck(req.body, 'log');
    mtcUtil.ParameterCheck(req.body, 'logger');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc100/log/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function get_mrc100_log(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(ip, req.url);
    request.get({
        url: config.MTCBridge + "/mrc100/log/" + req.params.mrc100key
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }
        var data = JSON.parse(body);
        if (data == null || data.result == undefined) {
            res.status(412).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function get_mrc011(req, res) {
    mtcUtil.ParameterCheck(req.params, 'mrc011key');

    request.put({
        url: config.MTCBridge + "/mrc011/" + req.params.mrc011key,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_mrc011(req, res) {
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'log');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc011/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function put_mrc011(req, res) {
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'log');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc011/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function get_mrc012(req, res) {
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'log');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc011/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function get_mrc012_sign(req, res) {
    mtcUtil.ParameterCheck(req.params, 'mrc012_id');
    mtcUtil.ParameterCheck(req.params, 'sign');

    request.post({
        url: config.MTCBridge + "/mrc011/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_mrc012(req, res) {
    mtcUtil.ParameterCheck(req.params, 'mrc012_id');
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'log');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc011/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function put_mrc012(req, res) {
    mtcUtil.ParameterCheck(req.params, 'mrc012_id');
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'log');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc011/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function delete_mrc012(req, res) {
    mtcUtil.ParameterCheck(req.params, 'mrc012_id');
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'log');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc011/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function get_mrc100_logger(req, res) {
    mtcUtil.ParameterCheck(req.params, 'token');

    request.get({
        url: config.MTCBridge + "/mrc100/logger/" + req.params.token,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function post_mrc100_logger(req, res) {
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'address');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.post({
        url: config.MTCBridge + "/mrc100/logger/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}

function delete_mrc100_logger(req, res) {
    mtcUtil.ParameterCheck(req.params, 'tkey');
    mtcUtil.ParameterCheck(req.body, 'token');
    mtcUtil.ParameterCheck(req.body, 'address');
    mtcUtil.ParameterCheck(req.body, 'signature');

    request.delete({
        url: config.MTCBridge + "/mrc100/logger/" + req.params.tkey,
        form: req.body
    }, function (error, response, body) {
        if (error != null) {
            res.status(412).send("MTC Server connection error");
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data == null || data.result == undefined) {
            res.status(400).send('MTC Main node response error');
            return;
        }
        if (data.result != 'SUCCESS') {
            res.status(412).send(data.msg);
            return;
        }
        res.send(data.data);
    });
}


function post_address_by_key(req, res) {
    mtcUtil.ParameterCheck(req.body, 'publickey');
	console.log("@" + req.body.publickey + "@");

    var fix_key =  req.body.publickey.replace(/(\\n|\\r|\r|\n|-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----)/gm, "").trim();
	console.log("["+fix_key+"]");
    db.get('ADDR_BY_PUBLICKEY:' + fix_key)
    .then(function (value) {
        res.send(JSON.parse(value));
    })
    .catch(function (err) {
        res.status(404).send('Address not found');
    });
}


// not chain code.
app.get('/block', get_block_number);
app.get('/block/:block', get_block);
app.get('/transaction/:transaction_id', get_transaction);

// bridge but not chain code.
app.get('/getkey/:keytype/:address', get_key);
app.get('/balance/:address', get_balance);

// wallet
app.get('/address/:address', get_address);
app.post('/address', upload.array(), post_address);
app.post('/address/bykey', upload.array(), post_address_by_key);

// transfer and exchange
app.post('/transfer', upload.array(), post_transfer);
app.post('/multitransfer', upload.array(), post_multitransfer);
app.post('/exchange/:fromTkey/:toTkey', upload.array(), post_exchange);

// token
app.get('/token/:token_id', get_token);
app.get('/totalsupply/:token_id', get_totalsupply);
app.post('/token', upload.array(), post_token);
app.put('/token/update/:tkey', upload.array(), put_token);
app.post('/token/:tkey', upload.array(), post_token_save);
app.put('/token/burn/:tkey', upload.array(), post_token_burn);
app.put('/token/increase/:tkey', upload.array(), post_token_increase);

app.get('/mrc011/:mrc011key', get_mrc011);
app.post('/mrc011/:tkey', post_mrc011);
app.put('/mrc011/:tkey', put_mrc011);
app.get('/mrc012/:mrc012_id', get_mrc012);
app.get('/mrc012/:mrc012_id/:sign', get_mrc012_sign);
app.post('/mrc012/:mrc012_id/:tkey', post_mrc012);
app.put('/mrc012/:mrc012_id/:tkey', put_mrc012);
app.delete('/mrc012/:mrc012_id/:tkey', delete_mrc012);


// mrc020
app.post('/mrc020', upload.array(), post_mrc020);
app.get('/mrc020/:mrc020key', upload.array(), get_mrc020);

// mrc030
app.get('/mrc030/:mrc030key', get_mrc030);
app.get('/mrc030/finish/:mrc030key', get_mrc030_finish);
app.post('/mrc030', upload.array(), post_mrc030);
app.post('/mrc030/:mrc030key', upload.array(), post_mrc030_join);
app.get('/mrc031/:mrc031key', get_mrc031);

// mrc040
app.get('/mrc040/:mrc040key', upload.array(), get_mrc040);
app.post('/mrc040/create/:tkey', upload.array(), post_mrc040_create);
app.post('/mrc040/cancel/:tkey', upload.array(), post_mrc040_cancel);
app.post('/mrc040/exchange/:tkey', upload.array(), post_mrc040_exchange);

// mrc100
app.post('/mrc100/payment', upload.array(), post_mrc100_payment);
app.post('/mrc100/reward', upload.array(), post_mrc100_reward);
app.post('/mrc100/log/:tkey', upload.array(), post_mrc100_log);
app.get('/mrc100/log/:mrc100key', upload.array(), get_mrc100_log);
app.get('/mrc100/logger/:token', get_mrc100_logger);
app.post('/mrc100/logger/:tkey', post_mrc100_logger);
app.delete('/mrc100/logger/:tkey', delete_mrc100_logger);


// token update for mrc040
app.post('/tokenUpdate/TokenBase/:tkey/:token/:baseToken', upload.array(), post_tokenupdate_tokenbase);
app.post('/tokenUpdate/TokenTargetAdd/:tkey/:token/:targetToken', upload.array(), post_tokenupdate_tokentargetadd);
app.post('/tokenUpdate/TokenTargetRemove/:tkey/:token/:targetToken', upload.array(), post_tokenupdate_tokentargetremove);

app.use(function (error, req, res, next) {
    console.log(error);
    if (error.message.indexOf('not found') > -1) {
        res.status(404).send(message);
    } else {
        res.status(412).send(error.message);
    }
});

try {
    db.open(function () {
        db.get('STAT:DB:CURRENT_NUMBER').then(function (value) {
            max_db_number = parseInt(value);
            max_db_number = max_db_number + 1;
            getFabricBlock();
        }).catch(function (err) {
            console.error(err);
            max_db_number = 1;
            getFabricBlock();
        });
    });
    http.createServer(app).listen(config.port, function () {
        console.log(app_title + ' listening on port ' + config.port);
    });
} catch (err) {
    console.log(err)
    console.error(app_title + ' port ' + listen_port + ' bind error');
}
