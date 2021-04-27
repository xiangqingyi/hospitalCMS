'use strict';

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let BedSchema = new Schema({

  paitent: {
      type: Schema.ObjectId,
      ref: "User"
  },
  doctor: {
      type: Schema.ObjectId,
      ref: "User"
  },
  room: {
      type: Schema.ObjectId,
      ref: "Ward"
  },

  created: {
      type: Date,
      default: Date.now
  }

});

BedSchema.methods = {

};

mongoose.model('Bed', BedSchema);
