const router = require('express').Router()

/* Add Router */
router.use(require('./address'))
router.use(require('./block'))
router.use(require('./mrc011'))
router.use(require('./mrc020'))
router.use(require('./mrc030'))
router.use(require('./mrc040'))
router.use(require('./mrc100'))
router.use(require('./mrc400'))
router.use(require('./mrc402'))
router.use(require('./mrc800'))
router.use(require('./token'))

module.exports = router
