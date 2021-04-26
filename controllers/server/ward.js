'use strict';

let mongoose = require('mongoose')
let _ = require('lodash')
let util = require('../../lib/util')
let Ward = mongoose.model('Ward')


exports.list =  async function(req, res) {
    let condition = {}
    try {
        const isAdmin = req.isAdmin
        let count = await Ward.count(condition)
        let results =  await Ward.find(condition).populate('bed_room_persons')
        let pageInfo = util.createPage(req.query.page, count)
        return res.render('server/ward/list', {
            title: "病房列表",
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
        return res.render('server/ward/add', {
            Menu: 'add'
        })
    } catch (error) {
        console.log('error')
        return res.render('server/info', {
            message: "获取新增病房页面失败"
        })
    }
  } else if (req.method === 'POST') {
    let obj = _.pick(req.body, 'bed_roomNo', 'bed_roomInfo', "beds");
    try {
        let ward = new Ward(obj)
        await ward.save()
        return res.json({
            status: true,
            message: "新增病房失败"
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
