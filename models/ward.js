'use strict';

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let WardSchema = new Schema({
  bed_roomNo: {
    type: String,
    required: true
  },
  bed_roomInfo: {
    type: String
  },
  bed_room_persons: [{
    type: Schema.ObjectId,
    ref: 'User'
  }],
  doctor: {
    type: Schema.ObjectId,
    ref: "User",
  },
  status: {
    type: Number,
    default: 0,   // 0: 没出院，1：已经出院
  }
});

WardSchema.methods = {

};

mongoose.model('Ward', WardSchema);
