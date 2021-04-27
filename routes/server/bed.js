'use strict';

let express = require('express')
let router = express.Router()
let util = require('../../lib/util')
let action = require('../../middlewares/action')
let bed = require('../../controllers/server/bed')

router.use(function (req, res, next) {
    // console.log('user: ' + Date.now());
    res.locals.Path = 'bed';
    next();
  });
  
  
  router.use(function (req, res, next) {
    if (!req.session.user) {
      let path = util.translateAdminDir('/user/login');
      return res.redirect(path);
    }
    next();
  });

router.route('/').get(action.checkAction('USER_INDEX'), bed.list);

router.route('/add').all(action.checkAction('USER_CREATE'), bed.add);

// router.route('/:id').get(action.checkAction('USER_DETAIL'), ward.one);

// router.route('/:id/edit').all(action.checkAction('USER_UPDATE'), ward.edit);

// router.route('/:id/del').post(action.checkAction('USER_DELETE'), ward.del);

module.exports = function (app) {
  let path = util.translateAdminDir('/bed');
  app.use(path, router);
};
