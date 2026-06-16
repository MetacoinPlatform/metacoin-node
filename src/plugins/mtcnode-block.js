
const { NumberPadding } = require('../utils/lib')
const { http_request } = require('../utils/lib.superagent')
const { logger } = require('../utils/lib.winston')
const config = require('../../config.json')

class MetacoinBlockProcessor {
	constructor(rocksdb) {
		this.max_db_number = 1
		const rocksObj = {};
		rocksdb(rocksObj, "", function () { })
		this.max_db_number = 1
		this.db = rocksObj.db
	}
	lastErrorTime = 0

	start() {
		this.db.open(() => {
			this.db.get('STAT:DB:CURRENT_NUMBER', { asBuffer: false }, (isError, value) => {
				if (isError) {
					this.max_db_number = 1
					this.getFabricBlock()
				} else {
					this.max_db_number = parseInt(value)
					this.max_db_number = this.max_db_number + 1
					this.getFabricBlock()
				}
			});
		});
	}

	async getTransactions(tx_id, db_id, db_sn, tx_idx) {

		let data
		try {
			let body = await http_request.get(config.MTCBridge + "/transaction/" + tx_id)
			data = JSON.parse(body.text);
			if (data == null || data.result == undefined || data.result != 'SUCCESS') {
				return true;
			}
		} catch (err) {
			logger.error(err)
			return true;
		}

		let save_data = [];
		let save_addr = ""
		logger.debug('Get Transaction BlockID : %s, Block SN : %s, TXID : %s', db_id, db_sn, tx_id);

		for (let txData of data.data) {	// save tx to item
			txData.db_id = db_id;
			txData.db_sn = db_sn;
			save_addr = "";
			if (txData.validationCode != 0) {	// TX is not success
				continue;
			}
			switch (txData.type) {
				case "Chaincode Install or Update":
					break;
				case "NewWallet":
					var fix_key = txData.parameters[1].replace(/(\r\n|\n|\r|-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----)/gm, "").trim();
					this.db.get('ADDR_BY_PUBLICKEY:' + fix_key, { asBuffer: false }, (isError, value) => {
						if (isError) {
							this.db.put('ADDR_BY_PUBLICKEY:' + fix_key, JSON.stringify([txData.parameters[0]]),
								() => { });
						} else {
							var a = JSON.parse(value);
							a.push(txData.parameters[0]);
							this.db.put('ADDR_BY_PUBLICKEY:' + fix_key, JSON.stringify(a),
								() => { });
						}
					});

				case "transfer":
				case "multi_transfer":
				case "transfer_mrc010buy":
				case "transfer_mrc010sell":
				case "transfer_mrc010bid":
				case "transfer_mrc010item":
				case "stodexRegister":
				case "mrc030create":

				case "transfer_mrc401buy":  // MRC401 buyer update
				case "transfer_mrc401createtrade":
				case "transfer_mrc401bid":
				case "transfer_mrc800take":
				case "transfer_mrc800":
				case "transfer_mrc402":
				case "transfer_mrc402buy":
				case "transfer_mrc402bid":

				case "stodexRegister":
				case "stodexUnRegister":
				case "stodexExchangePending":
					txData.values.tx_id = tx_id;
					txData.values.db_sn = db_sn;
					txData.values.db_id = db_id;
					save_addr = txData.parameters[0];
					break;

				// token change
				case "receive":
				case "token_reserve":
				case "mrc030reward":
				case "mrc030refund":

				// token change by mrc401
				case "receive_mrc010fee":
				case "receive_mrc010sell":
				case "receive_mrc010buy":
				case "receive_mrc010auction":
				case "receive_mrc010refund":
				case "receive_mrc010item":

				case "receive_mrc401buy":  // MRC401 seller update
				case "receive_mrc401sell":  // MRC401 seller update
				case "receive_mrc401fee":   // MRC401 fee update
				case "receive_mrc401refund":
				case "receive_mrc401auction":

				case "receive_mrc402":
				case "receive_mrc402fee":
				case "receive_mrc402sell":
				case "receive_mrc402auction":
				case "receive_mrc402refund":
				case "receive_mrc402item":
				case "receive_meltfee":
				case "receive_melt":
				case "stodexExchangeRequest":

				// mrc800 change
				case "receive_mrc800":
				case "receive_mrc800give":
					txData.values.tx_id = tx_id;
					txData.values.db_sn = db_sn;
					txData.values.db_id = db_id;
					save_addr = txData.parameters[1];
					break;
				case "tokenRemoveLogger":
				case "tokenAddLogger":
				case "tokenBurning":
				case "tokenUpdate":
				case "tokenIncrease":


				case "tokenAddTarget":
				case "SetBase":
				case "tokenAddTarget":
					logger.debug('MRC010 update %s', txData.parameters[0]);
					save_data.push({
						type: 'put',
						key: "TOKEN:DB:" + NumberPadding(txData.parameters[0]),
						value: JSON.stringify(txData.values)
					});
					break;

				case "tokenRegister":
					logger.debug('MRC010 register %s', txData.parameters.token);
					save_data.push({
						type: 'put',
						key: "TOKEN:DB:" + NumberPadding(txData.parameters.token),
						value: JSON.stringify(txData.parameters)
					});
					break;


				case "mrc010_sell":
				case "mrc010_unsell":
				case "mrc010_buy":
				case "mrc010_reqsell":
				case "mrc010_unreqsell":
				case "mrc010_acceptreqsell":
				case "mrc010_auction":
				case "mrc010_auctionbuynow":
				case "mrc010_auctionbid":
				case "mrc010_unauction":
				case "mrc010_auctionwinning":
				case "mrc010_auctionfailure":
					logger.debug('MRC010DEX update %s', txData.parameters[0]);
					save_data.push({
						type: 'put',
						key: "MRC010DEX:DB:" + txData.parameters[0],
						value: JSON.stringify(txData.values)
					});


					break;

				case "exchange":
					save_addr = txData.parameters[0];
					break;
				case "exchangePair":
					save_addr = txData.parameters[9];
					break;
				case "exchangeFee":
					save_addr = txData.parameters[3];
					break;
				case "exchangeFeePair":
					save_addr = txData.parameters[12];
					break;
				case "mrc100payment":
				case "mrc100paymentrecv":
				case "ownerBurning":
				case "ownerIncrease":
					save_addr = txData.address;
					break;
				case "mrc030":
				case "mrc030update":
				case "mrc030finish":
					logger.debug('MRC030 update %s', txData.parameters[1]);
					save_data.push({
						type: 'put',
						key: "MRC030:DB:" + txData.parameters[1],
						value: JSON.stringify(txData.values)
					});
					break;
				case "mrc031":
					logger.debug('MRC031 update %s_%s', txData.parameters[0], txData.parameters[1]);
					save_data.push({
						type: 'put',
						key: "MRC031:DB:" + txData.parameters[0] + "_" + txData.parameters[1],
						value: JSON.stringify(txData.values)
					});
					break;
				case "mrc400_create":
				case "mrc400_update":
					logger.debug('MRC400 update %s', txData.parameters[0]);
					save_data.push({
						type: 'put',
						key: "MRC400:DB:" + txData.parameters[0],
						value: JSON.stringify(txData.values)
					});
					break;

				case "mrc401_create":
				case "mrc401_createtrade":
				case "mrc401_update":
				case "mrc401_transfer":

				case "mrc401_sell":
				case "mrc401_unsell":
				case "mrc401_buy":

				case "mrc401_auction":
				case "mrc401_auctionbid":
				case "mrc401_auctionbuynow":
				case "mrc401_auctionwinning":
				case "mrc401_auctionfailure":
				case "mrc401_unauction":
				case "mrc401_melt":
					logger.debug('MRC401 update %s', txData.parameters[0]);
					save_data.push({
						type: 'put',
						key: "MRC401:DB:" + txData.parameters[0],
						value: JSON.stringify(txData.values)
					});
					break;

				case "mrc402_create":
				case "mrc402_update":
				case "mrc402_melt":
				case "mrc402_burn":
				case "mrc402_mint":
					logger.debug('MRC402 update %s', txData.parameters[0]);
					save_data.push({
						type: 'put',
						key: "MRC402:DB:" + txData.parameters[0],
						value: JSON.stringify(txData.values)
					});
					break;

				case "mrc402_sell":
				case "mrc402_unsell":
				case "mrc402_buy":

				case "mrc402_auction":
				case "mrc402_auctionbuynow":
				case "mrc402_auctionbid":
				case "mrc402_unauction":
				case "mrc402_auctionwinning":
				case "mrc402_auctionfailure":
					logger.debug('MRC402DEX update %s', txData.parameters[0]);
					save_data.push({
						type: 'put',
						key: "MRC402DEX:DB:" + txData.parameters[0],
						value: JSON.stringify(txData.values)
					});
					break;


				case "mrc800_create":
				case "mrc800_update":
					logger.debug('MRC800 update %s', txData.parameters[0]);
					save_data.push({
						type: 'put',
						key: "MRC800:DB:" + txData.parameters[0],
						value: JSON.stringify(txData.values)
					});
					break;

				// update owner nonce
				case "mrc010sell":
				case "mrc010unsell":
				case "mrc010reqsell":
				case "mrc010unreqsell":
				case "mrc010auction":
				case "mrc010unauction":
				case "mrc010auctionfailure":

				case "mrc400create":
				case "mrc400update":
				case "mrc401create":
				case "mrc401createtrade":
				case "mrc401update":
				case "mrc401transfer":
				case "mrc401sell":
				case "mrc401unsell":
				case "mrc401auction":
				case "mrc401unauction":

				case "mrc402create":
				case "mrc402update":
				case "mrc402burn":
				case "mrc402mint":
				case "mrc402transfer":
				case "mrc402melt":

				case "mrc402sell":
				case "mrc402unsell":
				case "mrc402buy":
				case "mrc402auction":
				case "mrc402unauction":
				case "mrc402auctionfailure":

				case "mrc800create":
				case "mrc800update":
					save_addr = txData.parameters[1];
					break;

				default:
					logger.error('Default Error %s, %s', txData.type, txData);
			}

			if (save_addr != "") {
				logger.debug('Address update %s', save_addr);
				save_data.push({
					type: 'put',
					key: "ADDRESS:CURRENT:" + save_addr,
					value: JSON.stringify(txData.values)
				});
				save_data.push({
					type: 'put',
					key: "ADDRESS:LOG:" + save_addr + ":" + NumberPadding(db_sn) + NumberPadding(tx_idx),
					value: JSON.stringify(txData.values)
				});
			}
		}	// end of save tx to item

		save_data.push({
			type: 'put',
			key: "TX:TX:" + data.data[0].id,
			value: JSON.stringify(data.data)
		})
		try {
			await this.db.batch(save_data)
			logger.debug('Transaction save %s, %s, %s', data.data[0].id, db_id, db_sn);
		} catch (err) {
			logger.error('Transaction save ERROR!!! [%s] %s', data.data[0].id, err.message);
		}
		return false;
	}

	async getFabricBlock() {
		let data;
		try {
			let body = await http_request.get(config.MTCBridge + "/block/" + this.max_db_number)
			data = JSON.parse(body.text);
		} catch (err) {
			logger.error(err)
			setTimeout(this.getFabricBlock.bind(this), 1000);
			return;
		}
		if (data == null || data.result == undefined || data.result != 'SUCCESS') {
			setTimeout(this.getFabricBlock.bind(this), 1000);
			return;
		}

		let save_data = [];
		let tx_idx = 0;

		for (let tx of data.data.transaction) {
			tx_idx = tx_idx + 1;
			console.log("Call get Transaction")
			let txResult = await this.getTransactions(tx.id, data.data.id, data.data.sn, tx_idx)
			if (txResult) {
				setTimeout(this.getFabricBlock.bind(this), 1000);
				return;
			}
		}

		save_data.push({
			type: 'put',
			key: "DB:TX:" + data.data.id,
			value: JSON.stringify(data.data)
		});

		save_data.push({
			type: 'put',
			key: "DB:SN:" + NumberPadding(data.data.sn),
			value: data.data.id
		});
		save_data.push({
			type: 'put',
			key: 'STAT:DB:CURRENT_NUMBER',
			value: this.max_db_number
		});

		try {
			await this.db.batch(save_data)
			logger.info('Block [%s] save, TX Index %s ', data.data.sn, tx_idx);
			this.max_db_number = this.max_db_number + 1;
			setImmediate(this.getFabricBlock.bind(this));
		} catch (err) {
			logger.error('Block [%s] save error %s', this.max_db_number, err.message);
			setImmediate(this.getFabricBlock.bind(this));
		}
	}
}

module.exports = function (rocksDBObject) {
	const MTCBlockProc = new MetacoinBlockProcessor(rocksDBObject)
	MTCBlockProc.start()
	return function (req, res, next) {
		Object.defineProperty(req, "MTCBlockProc", {
			writable: false,
			value: MTCBlockProc
		})
		next()
	}
}
