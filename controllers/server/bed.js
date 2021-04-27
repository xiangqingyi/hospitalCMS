'use strict';

let mongoose = require('mongoose')
let _ = require('lodash')
let util = require('../../lib/util')
let Ward = mongoose.model('Ward')
let Bed = mongoose.model('Bed')
let User = mongoose.model('User')
let Role = mongoose.model('Role')


exports.list =  async function(req, res) {
    let condition = {}
    try {
        const isAdmin = req.isAdmin
        let count = await Bed.count(condition)
        let results =  await Bed.find(condition).populate('paitent').populate('doctor').populate('room')

        let pageInfo = util.createPage(req.query.page, count)
        return res.render('server/bed/list', {
            title: "病床列表",
            rooms: results,
            pageInfo: pageInfo
        })
    } catch (error) {
        console.log(error)
        return res.render('server/info', {
            message: "获取病房列表失败"
        })
    }
}

exports.add = async function (req, res) {
  if (req.method === 'GET') {
    let condition = {};
    const isAdmin = req.isAdmin;
    if (!isAdmin) {
      condition.author = req.session.user._id;
    }
    try {
        const PatientRole = await Role.findOne({name: "Patient"})
        const results = await User.find(condition).populate('author').populate('roles')
        var patientArr = []
        if (results && results.length != 0) {
            results.map((item, index) => {
                if (item.roles[0].id == PatientRole.id) {
                    patientArr.push(item)
                }
            })
        }
        const doctorRole = await Role.findOne({name: "Doctor"})
        const results1 = await User.find(condition).populate('author').populate('roles')
        var doctorArr = []
        if (results1 && results1.length != 0) {
            results1.map((item, index) => {
                if (item.roles[0].id == doctorRole.id) {
                    doctorArr.push(item)
                }
            })
        }
        const rooms = await Ward.find(condition).populate('bed_room_persons')
        return res.render('server/bed/add', {
            Menu: 'add',
            patients: patientArr,
            doctors: doctorArr,
            rooms: rooms
        })
    } catch (error) {
        console.log('error')
        return res.render('server/info', {
            message: "获取新增病房页面失败"
        })
    }
  } else if (req.method === 'POST') {
    let obj = _.pick(req.body, 'paitent', 'doctor', "room");
    try {
        let bed = new Bed(obj)
        await bed.save()
        return res.json({
            status: true,
            message: "新增病床成功"
        })  
    } catch (error) {
        console.log(error)
        return res.json({
            status: false,
            message: "新增病房失败"
        })
    }
  }
};
exports.one = async function (req, res) {
    let id = req.params.id
    try {
        let wardInfo = await Ward.findById(id).populate('bed_room_persons')
        return res.render('server/ward/item', {
            ward: wardInfo
        })
    } catch (error) {
        console.log('one ward', error)
        return res.render('server/info', {
            message: '获取病房信息失败'
        })
    }
}

exports.edit = async function (req, res) {
    let id = req.params.id
    let room = await Ward.findById(id).populate('bed_room_persons')
    if (req.method === "GET") {
        return res.json({
            Menu: 'edit',
            result: room
        })
    } else if (req.method === "POST") {
       let obj = _.pick(req.body, 'bed_roomNo', 'bed_roomInfo');
       _.assign(room, obj)
       await room.save()
       return res.json({
           message: "修改病房信息成功",
           status: true
       })
    }
}


exports.del = async function (req, res) {
  let id = req.params.id;
  try {
      let room = await Ward.findById(id)
      if (!room) {
          return res.json({
              status: false,
              message: "改病房不存在"
          })
      }
      await room.remove()
      return res.json({
          status: true,
          message: "删除病房成功"
      })
  } catch (error) {
      return res.json({
          status: false,
          message: "删除病房失败"
      })
  }

};
