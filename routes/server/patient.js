'use strict';

let express = require('express')
let router = express.Router()
let util = require('../../lib/util')
let action = require('../../middlewares/action')
let patient = require('../../controllers/server/patient')

router.use(function (req, res, next) {
  // console.log('user: ' + Date.now());
  res.locals.Path = 'patient';
  next();
});


router.use(function (req, res, next) {
  if (!req.session.user) {
    let path = util.translateAdminDir('/user/login');
    return res.redirect(path);
  }
  next();
});

router.all('/query').all(patient.authenticate, patient.query)

router.route('/').get(action.checkAction('USER_INDEX'), patient.list);

router.route('/add').all(action.checkAction('USER_CREATE'), patient.add);

router.route('/:id').get(action.checkAction('USER_DETAIL'), patient.one);

router.route('/:id/edit').all(action.checkAction('USER_UPDATE'), patient.edit);

router.route('/:id/del').post(action.checkAction('USER_DELETE'), patient.del);

module.exports = function (app) {
  let path = util.translateAdminDir('/patient');
  app.use(path, router);
};
