const mongoose = require("mongoose");
const { TERMS } = require("../utils/constants");

const reportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    session: {
      type: String,
      required: true,
      trim: true,
    },

    term: {
      type: String,
      required: true,
      enum: TERMS,
    },

    attendance: {
      type: Number,
      default: 0,
      min: 0,
    },

    position: {
      type: Number,
      default: null,
    },

    teacherName: {
      type: String,
      default: "",
      trim: true,
    },

    teacherComment: {
      type: String,
      default: "",
      trim: true,
    },

    principalComment: {
      type: String,
      default: "",
      trim: true,
    },

    nextTermBegins: {
      type: String,
      default: "",
    },

    promotedTo: {
      type: String,
      default: "",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index(
  {
    student: 1,
    session: 1,
    term: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Report", reportSchema);