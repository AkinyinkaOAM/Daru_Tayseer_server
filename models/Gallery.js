const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide image title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Please provide image URL'],
    },
    cloudinaryPublicId: {
      type: String,
    },
    category: {
      type: String,
      trim: true,
      default: 'general',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Gallery', GallerySchema);

