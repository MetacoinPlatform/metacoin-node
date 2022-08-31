const rocks = require('level-rocksdb')

module.exports = function (path, options = {}) {
	const db = rocks(path, options)
	db.open()

	return function (req, res, next) {
		Object.defineProperty(req, "db", {
			writable: false,
			value: db
		})
		next()
	}
}