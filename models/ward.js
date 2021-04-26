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
  beds: {
      type: Object  // bedNo: 1, bedName: 1号床
  },
  bed_room_persons: [{
    type: Schema.ObjectId,
    ref: 'User'
  }],
  created: {
      type: Date,
      default: Date.now
  }

});

WardSchema.methods = {

};

mongoose.model('Ward', WardSchema);
