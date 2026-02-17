const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Please add a property title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  insertedBy: {
    type: String,
    enum: ['Owner', 'Broker'],
    default: 'Owner'
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative']
  },
  status: {
    type: String,
    enum: ['for-sale', 'for-rent', 'sold', 'rented'],
    required: [true, 'Please specify property status']
  },
  type: {
    type: String,
    enum: ['apartment', 'house', 'commercial', 'industrial', 'land'],
    required: [true, 'Please specify property type']
  },

  // Government Records
  govDetails: {
    khaataNumber: {
      type: String,
      trim: true
    },
    surveyNumber: {
      type: String,
      trim: true
    },
    area: {
      type: String, // as per user format: હે. આરે. ચો.મી. = ૦-૬૪-૭૫
      trim: true
    }
  },

  // Disadvantages
  disadvantages: [{
    type: String,
    trim: true
  }],

  // Area Information
  totalArea: {
    type: Number,
    required: [true, 'Total area is required'],
    min: [0, 'Total area cannot be negative']
  },
  areaVigha: {
    type: Number,
    min: [0, 'Area in Vigha cannot be negative']
  },
  areaAcre: {
    type: Number,
    min: [0, 'Area in Acre cannot be negative']
  },

  // Location
  location: {
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      required: [true, 'Please add a state'],
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
    },
    zipCode: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        default: 0
      },
      longitude: {
        type: Number,
        required: true,
        default: 0
      }
    }
  },

  // Amenities (flexible array for any property features)
  amenities: [{
    type: String,
    trim: true
  }],

  // Images
  images: [{
    url: {
      type: String
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Contact Information
  contactInfo: {
    name: {
      type: String,
      required: [true, 'Contact name is required']
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required']
    },
    whatsappNumber: String
  },

  // System Fields
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Property must have an owner']
  },
  agent: {
    type: mongoose.Schema.ObjectId,
    ref: 'Agent'
  },
  views: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for search functionality
propertySchema.index({
  title: 'text',
  description: 'text',
  'location.address': 'text',
  'location.city': 'text',
  'location.village': 'text',
  'location.taluka': 'text',
  'location.district': 'text'
});

// Index for filtering
propertySchema.index({ price: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ 'location.city': 1 });
propertySchema.index({ 'location.district': 1 });
propertySchema.index({ isFeatured: 1 });
propertySchema.index({ approvalStatus: 1 });
propertySchema.index({ owner: 1 });

// Virtual for primary image
propertySchema.virtual('primaryImage').get(function () {
  const primaryImg = this.images.find(img => img.isPrimary);
  return primaryImg ? primaryImg.url : (this.images.length > 0 ? this.images[0].url : '');
});

// Ensure virtual fields are serialized
propertySchema.set('toJSON', { virtuals: true });
propertySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Property', propertySchema);
