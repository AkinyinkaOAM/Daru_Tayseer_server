const mongoose = require('mongoose');

const NewsEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [180, 'Title cannot exceed 180 characters'],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [400, 'Summary cannot exceed 400 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [12000, 'Content cannot exceed 12000 characters'],
    },
    category: {
      type: String,
      enum: ['news', 'event', 'holiday'],
      default: 'news',
    },
    eventDate: Date,
    coverImageUrl: {
      type: String,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

NewsEventSchema.pre('save', function (next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('NewsEvent', NewsEventSchema);
