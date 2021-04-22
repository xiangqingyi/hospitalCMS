'use strict';

let express = require('express')
let router = express.Router()
let util = require('../../lib/util')
let action = require('../../middlewares/action')
let user = require('../../controllers/server/user')
let doctor = require('../../controllers/server/doctor')

router.use(function (req, res, next) {
  // console.log('user: ' + Date.now());
  res.locals.Path = 'doctor';
  next();
});


router.use(function (req, res, next) {
  if (!req.session.user) {
    let path = util.translateAdminDir('/user/login');
    return res.redirect(path);
  }
  next();
});

router.all('/query').all(doctor.authenticate, doctor.query)

router.route('/').get(action.checkAction('CONTENT_INDEX'), doctor.list);

router.route('/add').all(action.checkAction('CONTENT_CREATE'), doctor.add);

router.route('/:id').get(action.checkAction('CONTENT_UPDATE'), doctor.one);

router.route('/:id/edit').all(action.checkAction('CONTENT_UPDATE'), doctor.edit);

router.route('/:id/del').post(action.checkAction('CONTENT_DELETE'), doctor.del);

module.exports = function (app) {
  let path = util.translateAdminDir('/doctor');
  app.use(path, router);
};
