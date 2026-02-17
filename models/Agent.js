const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Agent must be linked to a user account']
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot be more than 1000 characters']
  },
  specialties: [{
    type: String,
    trim: true
  }],
  languages: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    default: 0
  },
  company: {
    name: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    taluka: {
      type: String,
      trim: true
    },
    village: {
      type: String,
      trim: true
    }
  },
  socialMedia: {
    facebook: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    },
    linkedin: {
      type: String,
      trim: true
    },
    youtube: {
      type: String,
      trim: true
    }
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5']
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5']
    },
    comment: {
      type: String,
      maxlength: [500, 'Review comment cannot be more than 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  achievements: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    year: {
      type: Number,
      required: true
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  propertiesSold: {
    type: Number,
    default: 0
  },
  totalSales: {
    type: Number,
    default: 0
  },
  responseTime: {
    type: String,
    enum: ['within 1 hour', 'within 2 hours', 'within 4 hours', 'within 24 hours'],
    default: 'within 24 hours'
  }
}, {
  timestamps: true
});

// Index for search functionality
agentSchema.index({
  bio: 'text',
  specialties: 'text',
  'company.name': 'text'
});

// Index for filtering
agentSchema.index({ isVerified: 1 });
agentSchema.index({ isActive: 1 });
agentSchema.index({ 'ratings.average': -1 });
agentSchema.index({ propertiesSold: -1 });

// Virtual for full name (from user)
agentSchema.virtual('fullName').get(function() {
  return this.user ? this.user.name : '';
});

// Virtual for email (from user)
agentSchema.virtual('email').get(function() {
  return this.user ? this.user.email : '';
});

// Virtual for phone (from user)
agentSchema.virtual('phone').get(function() {
  return this.user ? this.user.phone : '';
});

// Virtual for avatar (from user)
agentSchema.virtual('avatar').get(function() {
  return this.user ? this.user.avatar : '';
});

// Method to calculate average rating
agentSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.ratings.average = 0;
    this.ratings.count = 0;
  } else {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.ratings.average = sum / this.reviews.length;
    this.ratings.count = this.reviews.length;
  }
};

// Pre-save middleware to calculate average rating
agentSchema.pre('save', function(next) {
  this.calculateAverageRating();
  next();
});

// Ensure virtual fields are serialized
agentSchema.set('toJSON', { virtuals: true });
agentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Agent', agentSchema);
