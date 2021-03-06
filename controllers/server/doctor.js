'use strict';

let mongoose = require('mongoose')
let User = mongoose.model('User')
let Doctor = mongoose.model('Doctor')
let Role = mongoose.model('Role')
let LogService = require('../../services/log');
let Log = new LogService();
let config = require('../../config')
let util = require('../../lib/util')
let crypto = require('../../lib/crypto')
let Mailer = require('../../lib/mailer')
let _ = require('lodash');
let mailer = new Mailer();
const notify = require('../../notify');


// TODO: Run when the service is started 
exports.checkInstall = function (req, res, next) {
  if (req.session.user) {
    let path = util.translateAdminDir('/');
    return res.redirect(path);
  }
  User.find({}, function (err, results) {
    if (err) {
      return;
    }
    if (results.length > 0) {
      // let path = util.translateAdminDir('/user/login');
      // return res.redirect(path);
      return next();
    } else {
      //let path = util.translateAdminDir('/install');
      //return res.redirect(path);
      let path = util.translateAdminDir('/install')
      return res.render('server/install')
    }
  })
}

/*let user = new User({
    username: 'geo5',
    password: '123456',
    name: 'test5',
    email: 'geo_5@wenglou.com',
    position: [113.323571, 23.146439]
});
user.save(function(err, result) {
    console.log(result);
    
});*/
/*User.find({'position': {$near: [113.323571, 23.146439]}}).exec(function(err, res) {
    console.log(res);
})*/
/*User.find({'position': {
    $geoWithin: {
        $centerSphere: [
            [113.323571, 23.146439], .0000000000000005
        ]
    }
}}).exec(function(err, res) {
    console.log(res);
})*/

exports.authenticate = function (req, res, next) {
  if (!req.session.user) {
    let path = util.translateAdminDir('/user/login');
    return res.redirect(path);
  } else {
    next();
  }
};


/**
 * 医生列表
 * 医生数量
 *  */  
exports.list = async function (req, res) {
    let condition = {}
    const isAdmin = req.isAdmin
    if (!isAdmin) {
        condition.author = req.session.user._id
    }
    const doctorRole = await Role.findOne({name: "Doctor"})
    const results = await User.find(condition).populate('author').populate('roles')
    var arr = []
    if (results && results.length != 0) {
        results.map((item, index) => {
            if (item.roles[0].id == doctorRole.id) {
                arr.push(item)
            }
        })
    }
    const pageInfo = util.createPage(req.query.page, arr.length)
    // arr.sort({created: -1}).limit(pageInfo.pageSize).skip(pageInfo.start)
    return res.render('server/doctor/list', {
        title: '医生列表',
        doctors: arr,
        pageInfo: pageInfo,
        Menu: 'list'
    })
}

/**
 * 医生个人信息
*/
exports.one = async function (req, res) {
    let id = req.params.id
    const doctor = await User.findById(id).populate('author').populate('roles')
    return res.render('server/doctor/item', {
        doctor: doctor
    })
}

/**
 * 关联信息查询
 * name
*/
exports.query = async function (req, res) {
    try {
        let kw = req.query.q;
        const doctors = await Doctor.find({name: new RegExp(kw, 'gi')})
        if (doctor) {
            let data = doctors.map(function(item) {
                return _.pick(item, '_id', 'name')
            }) 
            return res.json({
                status: true,
                items: data
            })
        } else {
            return res.json({
                status: false,
                message: '找不到医生信息'
            })
        }  
    } catch (error) {
        console.log('查找医生个人信息失败')
        console.log(error)
        return res.render('server/info', {
            message: "查找医生个人信息失败"
        })
    }

}



exports.register = function (req, res) {
  let ip = util.getIp(req);
  let ua = req.get('User-Agent');

  let method = req.method;
  if (method === 'GET') {
    res.render('server/user/register', {});
  } else if (method === 'POST') {
    let obj = _.pick(req.body, 'username', 'password', 'email', 'mobile', 'name', 'avatar', 'gender', 'birthday', 'description', 'address', 'position', 'questions');
    obj.reg_ip = ip;
    // console.log(obj);
    notify.sendMessage(`User Register: ${obj.username}`);
    let operator = function () {
      Role.findOne({ status: 202 }, function (err, role) {
        console.log('role', role);
        if (err || !role) {
          return res.render('server/info', {
            message: 'Failure, role not exist:' + config.admin.role.user
          });
        }
        obj.roles = [role._id];
        if (req.session.user) {
          obj.author = req.session.user._id;
        }
        // TODO：user activation

        let user = new User(obj);
        user.save(function (err, result) {
          console.log(result);
          Log.add({
            type: 'user',
            action: 'register',
            status: !err ? 'success' : 'failed',
            ip: ip,
            ua: ua,
            message: JSON.stringify(_.pick(obj, 'username', 'name', 'email', 'reg_ip')) + '\n' + err
          })
          if (err) {
            console.log(err);
            let errors = err.errors;
            let message = [];
            for (let i in errors) {
              message.push(errors[i].message);
            }
            return res.render('server/info', {
              message: 'Failure' + message.join('<br/>')
            });
          }
          res.render('server/info', {
            message: 'Success'
          });

        });
      });
    }

    if (config.stopForumSpam) {
      util.stopForumSpam({
        email: obj.email
      }).then((data) => {
        console.log(data, 'res')
        if (data && data.email && data.email.frequency > 5) {
          res.render("server/info", {
            message: "mail not allowed",
          });
          Log.add({
            type: 'user',
            action: 'register',
            status: 'spam',
            ip: ip,
            ua: ua,
            message: JSON.stringify(_.pick(obj, 'username', 'name', 'email', 'reg_ip')) + '\n stopforumspam'
          })
        } else {
          operator()
        }
      }, (err) => {
        //console.log(err, 'err')
        operator()
      })
    } else {
      operator()
    }

  }
};

exports.add = async function (req, res) {
  let method = req.method;
  if (method === 'GET') {
    res.render('server/doctor/add', {
      Menu: 'add'
    });
  } else if (method === 'POST') {
    //let obj = req.body;
    let obj = _.pick(req.body, 'username', 'password', 'email', 'mobile', 'name', 'avatar', 'gender', 'birthday', 'description', 'address', 'position', 'questions', 'tel');
    console.log(obj);
    // if(!(/^[1][3,4,5,7,8][0-9]{9}$/.test(obj.tel))){ 
    //   return res.json({
    //     status: false,
    //     message: "手机号格式错误"
    //   })
//   } 

    Role.findOne({ name: "Doctor" },async  function (err, role) {
      console.log('role', role);

      if (err || !role) {
        return res.render('server/info', {
          message: 'Failure, role not exist:' + config.admin.role.user
        });
      }
      obj.roles = [role._id];
      if (req.session.user) {
        obj.author = req.session.user._id;
      }
      let user = new User(obj);
      let jUser = await User.findOne({username: obj.username});
      if (jUser) {
        return res.json({
          status: false,
          message: "用户名已存在"
        })
      }
      user.save(function (err, result) {
        console.log(result);
        if (err) {
          console.log(err);
          return res.json({
              status: false,
              message: '新增失败'
          })
        }
        // return res.render('server/info', {
        //   message: '新增成功',
        //   status: true
        // });
        return res.json({
            status: true,
            message: '新增成功'
        })
      });
    });
  }
};

/**
 * 编辑医生的个人信息
 * */ 
exports.edit = async function (req, res) {
    let id = req.params.id
    const doctor = await User.findById(id).populate('author')
    const isAuthor = doctor.author && ((doctor.author._id + '') === req.session.user._id)
    const isAdmin = req.isAdmin

    if (req.method == "GET") {
        try {
            if (!isAdmin && !isAuthor) {
                return res.render('server/info', {
                    message: '无权限操作'
                })
            }
            let condition = {}
            if (!isAdmin) { // 不是管理员是本人
                condition.author = req.session.user._id
            }
            const roles = await Role.find(condition)
            return res.render('server/doctor/edit', {
                doctor: doctor,
                roles: roles
            })

            
        } catch (error) {
            console.log(error)
            return res.render('server/info', {
                message: '编辑医生个人信息失败'
            })
        }
    } else if (req.method == "POST") {
        
        // 判断是否有权限
        let obj = _.pick(req.body, 'username', 'email', 'mobile', 'name', 'avatar', 'gender', 'birthday', 'description', 'address', 'position', 'questions', 'roles', 'physician');

        const isMine = doctor._id === req.user._id 
        const roles = req.Roles
        const inputRoles = _.difference(obj.roles, roles)
        if (!isAdmin && !isAuthor && !isAuthor) {
            return res.render('server/info', {
                message: '没有权限'
            })
        }
        if (!isAdmin && inputRoles.length > 0) {
            return res.render('server/info', {
                message: '没有权限'
            })
        }
        let query
        if (typeof obj.roles === 'string') {
            query = await Role.find({_id: obj.roles})
        } else if (typeof obj.roles === 'object') {
            query = await Role.find({_id: {$in: obj.roles}})
        }
        if (!query) {
            return res.render('server/info', {
                message: '没有查到相关的角色'
            })
        }
        // 管理员
        if (doctor.status === 101) {
            let statuses = _.map(roles, "status")
            if (statuses.indexOf(201) === -1) {
                return res.render('server/info', {
                    message: '管理员角色不能修改'
                })
            }
        }
        obj.roles = query
        _.assign(doctor, obj)

        try {
            await doctor.save()
            if (id === req.session.user._id) {
                req.session.user = doctor
                req.locals.User = doctor
            }
       
            return res.json({
              status: true,
              message: '修改成功'
            })
        } catch (error) {
            console.log(error)
            return res.json({
              status: false,
              message: '修改失败'
            })
        }
    }
}

/**
 * 删除指定的doctor信息，改变status，不显示
 * */ 

exports.del = async function (req, res) {
    let id = req.params.id
    let isAdmin = req.isAdmin
    const doctor = await User.findById(id).populate('roles').populate('author')
    if (!doctor) {
        return res.render('server/info', {
            message: "不存在这个医生"
        })
    }
    const isAuthor = doctor.author && ((doctor.author._id + '') === req.session.user._id);
    if (!isAdmin  && !isAuthor) {
        return res.render('server/info', {
            message: '没有权限'
        })
    }
    if (doctor.status === 101) {
        return res.render('server/info', {
            message: "系统管理员，不能删除"
        })
    }
    try {
        await doctor.remove()
        if (id === req.session.user._id) {
            req.session.destroy()
            res.locals.User = null
            let path = util.translateAdminDir('')
            return res.redirect(path)
        }
        return res.render('server/info', {
            message: '删除信息成功'
        })

    } catch (error) {
        console.log(error)
        return res.render('server/info', {
            message: '删除指定医生失败'
        })
        
    }    
}

let noRedirect = [
  'user/login',
  'user/forget',
  'user/register'
]

exports.login = function (req, res) {
  let ip = util.getIp(req);
  let ua = req.get('User-Agent');

  if (req.method === 'GET') {
    req.session.loginReferer = req.headers.referer;
    res.render('server/user/login');
  } else if (req.method === 'POST') {
    let username = (req.body.username || '').trim();
    let password = req.body.password;
    if (!username) {
      return res.render("server/info", {
        message: "User name cannot be empty",
      });
    }
    notify.sendMessage(`User Login: ${username}`);
    User.findOne({
      username: username
    }).populate('roles').exec(function (err, user) {

      if (!user) {
        Log.add({
          type: "user",
          action: "login",
          status: "failed",
          ip: ip,
          ua: ua,
          message:
            JSON.stringify({
              username: username,
              ip: ip,
            }) +
            "\nNot Exist\n" +
            err,
        });
        return res.render("server/info", {
          message: "Wrong user name or password",
        });
      }
      if (user.authenticate(password)) {
        console.log('Success');
        // console.log(user);
        user.last_login_date = new Date();
        user.last_login_ip = ip;
        user.save();
        req.session.user = user;
        req.session.cookie.user = user;
        let path = util.translateAdminDir('/');

        let ref = req.session.loginReferer || path;
        for (let i = 0, len = noRedirect.length; i < len; i++) {
          if (ref.indexOf(noRedirect[i]) > -1) {
            ref = path;
            break;
          }
        }
        res.redirect(ref);
        Log.add({
          type: 'user',
          action: 'login',
          status: 'success',
          ip: ip,
          ua: ua,
          author: user,
          message: JSON.stringify({
            username: username,
            ip: ip
          }) + '\n' + err
        })
      } else {
        res.render("server/info", {
          message: "Wrong user name or password",
        });
        let hunter = (username === 'admin') ? (' \ntry password[' + password + ']') : ''
        Log.add({
          type: "user",
          action: "login",
          status: "failed",
          ip: ip,
          ua: ua,
          message:
            JSON.stringify({
              username: username,
              ip: ip,
            }) +
            "\npassword incorrect" +
            hunter +
            "\n" +
            err,
        });
      }
    });
  }

};

// reload session
exports.reload = function (uid, callback) {
  User.findById(uid).populate('roles').exec(function (err, user) {
    callback && callback.call(null, err, user);
  });
};

exports.logout = function (req, res) {
  if (req.session) {
    req.session.destroy();
    res.locals.User = null;
    console.log('Success');
    /*res.render('server/info', {
        message: 'Success'
    });*/
    let path = util.translateAdminDir('/');
    res.redirect(path);
  } else {
    res.render('server/info', {
      message: 'Failure'
    });
  }
};

exports.forget = function (req, res) {
  if (req.method === 'GET') {
    let hash = req.query.hash;
    if (!hash) {
      return res.render('server/user/forget');
    }
    User.findOne({ 'forget.hash': hash }, function (err, user) {
      console.log(err, user);
      if (err || !user) {
        return res.render('server/info', {
          message: 'invalid hash'
        });
      }
      let till = user.forget.till;
      // check hash expired
      if (!till || till.getTime() + config.findPasswordTill < Date.now()) {
        return res.render("server/info", {
          message: "Hash Expired",
        });
      } else {
        res.render('server/user/forget', {
          type: 'set',
          hash: hash,
          user: user
        });
      }
    });

  } else if (req.method === 'POST') {
    //console.log(req.query);
    if (req.query.hash) {
      let obj = req.body;
      let hash = req.query.hash;
      //update password
      User.findOne({ 'forget.hash': hash }, function (err, user) {
        //console.log(err, user);
        if (err || !user) {
          return res.render("server/info", {
            message: "token expired",
          });
        }
        let till = user.forget.till;
        //console.log(till.getTime(), Date.now());
        if (!till || till.getTime() + config.findPasswordTill < Date.now()) {
          return res.render("server/info", {
            message: "token expired",
          });
        } else {
          console.log('update');
          user.password = obj.password;
          user.forget.hash = '';
          user.forget.till = 0;
          user.save(function (err, result) {
            res.render('server/info', {
              message: 'Success'
            });
          });
        }
      });
      return;
    }
    let obj = req.body;
    let ip = util.getIp(req);
    let ua = req.get('User-Agent');
    Log.add({
      type: 'user',
      action: 'forget',
      status: 'start',
      ip: ip,
      ua: ua,
      message: obj.username
    })
    User.findOne({ username: obj.username }, function (err, user) {
      //console.log(user);
      if (err || !user) {
        return res.render('server/info', {
          message: 'error'
        });
      }
      let hash = crypto.random();
      user.forget = {
        hash: hash,
        till: new Date()
      };
      user.save(function (err, result) {
        //console.log(result);
        if (err || !result) {
          return res.render('server/info', {
            message: 'error '
          });
        }

        let url = req.headers.origin + req.originalUrl + '?hash=' + hash;

        mailer.send({
          from: config.mail.from,
          to: user.email,
          subject: 'Find Password',
          html: '<p>Hello, please click <a href="' + url + '">here</a>to reset your password<br/>' + url + '</p>',
        }).then((info) => {
          let message =
            "The reset password link has been sent to your mailbox:  " +
            user.email.replace(/^([\s\S])(.+)([\s\S])(@.+)/, "$1****$3$4");
          //console.log(err && err.stack);
          //console.dir(reply);
          res.render('server/info', {
            message: message
          });
        }).catch((err) => {
          res.render('server/info', {
            message: 'Failure'
          });
        })
      });

    });

  }
}

exports.changePassword = function (req, res) {
  let obj = req.body;
  User.findById(obj.id, function (err, user) {
    user.password = obj.password;
    user.save(function (err, result) {
      res.render('server/info', {
        message: 'Success'
      });
      console.log('Success', result);
    })
  });
};
