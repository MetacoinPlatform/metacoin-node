const { NumberPadding } = require('../utils/lib')
const { request } = require('../utils/lib.superagent')
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
			this.db.get('STAT:DB:CURRENT_NUMBER').then((value) => {
				this.max_db_number = parseInt(value)
				this.max_db_number = this.max_db_number + 1
				this.getFabricBlock()
			}).catch((err) => {
				logger.error(err)
				this.max_db_number = 1
				this.getFabricBlock()
			});
		});
	}

	getTransactions(tx_id, db_id, db_sn, tx_idx) {
		var self = this

		request.get(config.MTCBridge + "/transaction/" + tx_id,
			(error, body) => {
				if (error != null) {
					return;
				}
				let data = JSON.parse(body.text);
				if (data == null || data.result == undefined || data.result != 'SUCCESS') {
					return;
				}

				let save_data = [];
				let save_addr = ""
				logger.debug('Get Transaction BlockID : %s, Block SN : %s, TXID : %s', db_id, db_sn, tx_id);

				data.data.forEach((d) => {
					d.db_id = db_id;
					d.db_sn = db_sn;
					save_addr = "";
					if (d.validationCode != 0) {
						return;
					}
					switch (d.type) {
						case "Chaincode Install or Update":
							break;
						case "NewWallet":
							var fix_key = d.parameters[1].replace(/(\r\n|\n|\r|-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----)/gm, "").trim();
							this.db.get('ADDR_BY_PUBLICKEY:' + fix_key)
								.then((value) => {
									var a = JSON.parse(value);
									a.push(d.parameters[0]);
									this.db.put('ADDR_BY_PUBLICKEY:' + fix_key, JSON.stringify(a));
								})
								.catch((err) => {
									this.db.put('ADDR_BY_PUBLICKEY:' + fix_key, JSON.stringify([d.parameters[0]]));
								});

						case "transfer":
						case "multi_transfer":
						case "stodexRegister":
						case "mrc030create":
						case "transfer_mrc401buy":  // MRC401 buyer update
						case "transfer_mrc401bid":
						case "transfer_mrc800take":
						case "transfer_mrc800":
						case "transfer_mrc402":
						case "transfer_mrc402buy":
						case "transfer_mrc402bid":
						case "stodexRegister":
						case "stodexUnRegister":
						case "stodexExchangePending":
							d.values.tx_id = tx_id;
							d.values.db_sn = db_sn;
							d.values.db_id = db_id;
							save_addr = d.parameters[0];
							break;

						// token change
						case "receive":
						case "token_reserve":
						case "mrc030reward":
						case "mrc030refund":

						// token change by mrc401
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
							logger.debug('MRC010 update %s', d.parameters[0]);
							save_data.push({
								type: 'put',
								key: "TOKEN:DB:" + NumberPadding(d.parameters[0]),
								value: JSON.stringify(d.values)
							});
							break;

						case "tokenRegister":
							logger.debug('MRC010 register %s', d.parameters.token);
							save_data.push({
								type: 'put',
								key: "TOKEN:DB:" + NumberPadding(d.parameters.token),
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
							logger.debug('MRC030 update %s', d.parameters[1]);
							save_data.push({
								type: 'put',
								key: "MRC030:DB:" + d.parameters[1],
								value: JSON.stringify(d.values)
							});
							break;
						case "mrc031":
							logger.debug('MRC031 update %s_%s', d.parameters[0], d.parameters[1]);
							save_data.push({
								type: 'put',
								key: "MRC031:DB:" + d.parameters[0] + "_" + d.parameters[1],
								value: JSON.stringify(d.values)
							});
							break;
						case "mrc400_create":
						case "mrc400_update":
							logger.debug('MRC400 update %s', d.parameters[0]);
							save_data.push({
								type: 'put',
								key: "MRC400:DB:" + d.parameters[0],
								value: JSON.stringify(d.values)
							});

						case "mrc401_create":
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
							logger.debug('MRC401 update %s', d.parameters[0]);
							save_data.push({
								type: 'put',
								key: "MRC401:DB:" + d.parameters[0],
								value: JSON.stringify(d.values)
							});
							break;

						case "mrc402_create":
						case "mrc402_update":
						case "mrc402_melt":
						case "mrc402_burn":
						case "mrc402_mint":
							logger.debug('MRC402 update %s', d.parameters[0]);
							save_data.push({
								type: 'put',
								key: "MRC402:DB:" + d.parameters[0],
								value: JSON.stringify(d.values)
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
							logger.debug('MRC402DEX update %s', d.parameters[0]);
							save_data.push({
								type: 'put',
								key: "MRC402DEX:DB:" + d.parameters[0],
								value: JSON.stringify(d.values)
							});
							break;


						case "mrc800_create":
						case "mrc800_update":
							logger.debug('MRC800 update %s', d.parameters[0]);
							save_data.push({
								type: 'put',
								key: "MRC800:DB:" + d.parameters[0],
								value: JSON.stringify(d.values)
							});
							break;

						// update owner nonce
						case "mrc400create":
						case "mrc400update":
						case "mrc401create":
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
							save_addr = d.parameters[1];
							break;

						default:
							logger.error('Default Error %s, %s', d.type, d);
					}

					if (save_addr != "") {
						logger.debug('Address update %s', save_addr);
						save_data.push({
							type: 'put',
							key: "ADDRESS:CURRENT:" + save_addr,
							value: JSON.stringify(d.values)
						});
						save_data.push({
							type: 'put',
							key: "ADDRESS:LOG:" + save_addr + ":" + NumberPadding(db_sn) + NumberPadding(tx_idx),
							value: JSON.stringify(d.values)
						});
					}
				});
				save_data.push({
					type: 'put',
					key: "TX:TX:" + data.data[0].id,
					value: JSON.stringify(data.data)
				})
				this.db.batch(save_data)
					.then(() => {
						logger.debug('Transaction save %s, %s, %s', data.data[0].id, db_id, db_sn);
					})
					.catch((err) => {
						logger.error('Transaction save ERROR!!! [%s] %s', data.data[0].id, err.message);
					});
			});
	}
	getFabricBlock() {
		request.get(config.MTCBridge + "/block/" + this.max_db_number,
			(error, body) => {
				if (error != null) {
					logger.error("Metacoin bridge : %s", error.message);
					setTimeout(this.getFabricBlock.bind(this), 1000);
					return;
				}
				let data;
				try {
					data = JSON.parse(body.text);
				} catch (err) {
					return;
				}
				if (data == null || data.result == undefined || data.result != 'SUCCESS') {
					setTimeout(this.getFabricBlock.bind(this), 1000);
					return;
				}
				let save_data = [];
				let tx_idx = 0;
				data.data.transaction.forEach((tx) => {
					tx_idx = tx_idx + 1;
					this.getTransactions(tx.id, data.data.id, data.data.sn, tx_idx);
				});
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

				this.db.batch(save_data)
					.then(() => {
						logger.info('Block [%s] save, TX Index %s ', data.data.sn, tx_idx);
						this.max_db_number = this.max_db_number + 1;
						setImmediate(this.getFabricBlock.bind(this));
					})
					.catch((err) => {
						logger.error('Block [%s] save error %s', this.max_db_number, err.message);
						setImmediate(this.getFabricBlock.bind(this));
					});
			});
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