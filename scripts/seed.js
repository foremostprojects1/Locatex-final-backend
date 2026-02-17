const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Agent = require('../models/Agent');
const Property = require('../models/Property');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Agent.deleteMany({});
    await Property.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@realestate.com',
      password: 'admin123',
      phone: '+1234567890',
      role: 'admin',
      isActive: true
    });

    // Create agent users
    const agent1 = await User.create({
      name: 'John Smith',
      email: 'john@realestate.com',
      password: 'agent123',
      phone: '+1234567891',
      role: 'agent',
      isActive: true
    });

    const agent2 = await User.create({
      name: 'Sarah Johnson',
      email: 'sarah@realestate.com',
      password: 'agent123',
      phone: '+1234567892',
      role: 'agent',
      isActive: true
    });

    // Create regular users
    const user1 = await User.create({
      name: 'Mike Wilson',
      email: 'mike@example.com',
      password: 'user123',
      phone: '+1234567893',
      role: 'user',
      isActive: true
    });

    const user2 = await User.create({
      name: 'Emily Davis',
      email: 'emily@example.com',
      password: 'user123',
      phone: '+1234567894',
      role: 'user',
      isActive: true
    });

    console.log('👥 Created users');

    // Create agent profiles
    const agentProfile1 = await Agent.create({
      user: agent1._id,
      bio: 'Experienced real estate agent with over 10 years in the business. Specializing in luxury homes and commercial properties.',
      specialties: ['Luxury Homes', 'Commercial Properties', 'Investment Properties'],
      languages: ['English', 'Spanish'],
      experience: 10,
      licenseNumber: 'RE123456',
      company: {
        name: 'Premium Real Estate',
        address: '123 Main St, New York, NY 10001',
        phone: '+1234567890',
        website: 'https://premiumrealestate.com'
      },
      socialMedia: {
        facebook: 'https://facebook.com/johnsmith',
        twitter: 'https://twitter.com/johnsmith',
        linkedin: 'https://linkedin.com/in/johnsmith'
      },
      isVerified: true,
      isActive: true,
      propertiesSold: 45,
      totalSales: 25000000,
      responseTime: 'within 2 hours'
    });

    const agentProfile2 = await Agent.create({
      user: agent2._id,
      bio: 'Passionate about helping families find their dream homes. Expert in residential properties and first-time home buyers.',
      specialties: ['Residential Properties', 'First-time Buyers', 'Family Homes'],
      languages: ['English', 'French'],
      experience: 7,
      licenseNumber: 'RE789012',
      company: {
        name: 'Family First Realty',
        address: '456 Oak Ave, Los Angeles, CA 90210',
        phone: '+1234567891',
        website: 'https://familyfirstrealty.com'
      },
      socialMedia: {
        facebook: 'https://facebook.com/sarahjohnson',
        instagram: 'https://instagram.com/sarahjohnson',
        linkedin: 'https://linkedin.com/in/sarahjohnson'
      },
      isVerified: true,
      isActive: true,
      propertiesSold: 32,
      totalSales: 18000000,
      responseTime: 'within 1 hour'
    });

    console.log('🏠 Created agent profiles');

    // Create sample properties
    const properties = [
      {
        title: 'Luxury Downtown Apartment',
        description: 'Stunning luxury apartment in the heart of downtown with panoramic city views. Features modern amenities and premium finishes throughout.',
        price: 850000,
        priceType: 'sale',
        propertyType: 'apartment',
        status: 'available',
        location: {
          address: '123 Downtown Ave, New York, NY 10001',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          coordinates: { lat: 40.7589, lng: -73.9851 }
        },
        specifications: {
          bedrooms: 2,
          bathrooms: 2,
          area: 1200,
          areaUnit: 'sqft',
          floors: 1,
          yearBuilt: 2020,
          parking: 1,
          garage: 1
        },
        features: ['City View', 'Modern Kitchen', 'Hardwood Floors', 'Balcony'],
        amenities: ['Gym', 'Pool', 'Concierge', 'Parking'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
            alt: 'Luxury apartment living room',
            isPrimary: true
          },
          {
            url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
            alt: 'Modern kitchen',
            isPrimary: false
          }
        ],
        agent: agentProfile1._id,
        owner: adminUser._id,
        isFeatured: true,
        isPublished: true
      },
      {
        title: 'Family Home with Garden',
        description: 'Beautiful family home in a quiet neighborhood. Perfect for families with children, featuring a large backyard and modern amenities.',
        price: 650000,
        priceType: 'sale',
        propertyType: 'house',
        status: 'available',
        location: {
          address: '456 Maple Street, Los Angeles, CA 90210',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
          coordinates: { lat: 34.0901, lng: -118.4065 }
        },
        specifications: {
          bedrooms: 4,
          bathrooms: 3,
          area: 2500,
          areaUnit: 'sqft',
          floors: 2,
          yearBuilt: 2015,
          parking: 2,
          garage: 2
        },
        features: ['Large Garden', 'Modern Kitchen', 'Fireplace', 'Hardwood Floors'],
        amenities: ['Swimming Pool', 'Garden', 'Garage', 'Security System'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
            alt: 'Family home exterior',
            isPrimary: true
          },
          {
            url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
            alt: 'Beautiful garden',
            isPrimary: false
          }
        ],
        agent: agentProfile2._id,
        owner: adminUser._id,
        isFeatured: true,
        isPublished: true
      },
      {
        title: 'Modern Studio Apartment',
        description: 'Contemporary studio apartment perfect for young professionals. Located in a vibrant neighborhood with easy access to public transportation.',
        price: 2800,
        priceType: 'rent',
        propertyType: 'apartment',
        status: 'available',
        location: {
          address: '789 Urban Blvd, San Francisco, CA 94102',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA',
          coordinates: { lat: 37.7749, lng: -122.4194 }
        },
        specifications: {
          bedrooms: 0,
          bathrooms: 1,
          area: 600,
          areaUnit: 'sqft',
          floors: 1,
          yearBuilt: 2018,
          parking: 0,
          garage: 0
        },
        features: ['Modern Design', 'High Ceilings', 'Large Windows', 'Built-in Storage'],
        amenities: ['Gym', 'Laundry', 'Rooftop Deck', 'Bike Storage'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            alt: 'Modern studio apartment',
            isPrimary: true
          }
        ],
        agent: agentProfile1._id,
        owner: adminUser._id,
        isFeatured: false,
        isPublished: true
      }
    ];

    await Property.insertMany(properties);
    console.log('🏘️  Created sample properties');

    // Add some reviews to agents
    agentProfile1.reviews.push({
      user: user1._id,
      rating: 5,
      comment: 'John was amazing! He helped us find our dream home and made the entire process smooth and stress-free.'
    });

    agentProfile1.reviews.push({
      user: user2._id,
      rating: 4,
      comment: 'Very professional and knowledgeable. Would definitely recommend!'
    });

    agentProfile2.reviews.push({
      user: user1._id,
      rating: 5,
      comment: 'Sarah is the best! She understood exactly what we were looking for and found us the perfect family home.'
    });

    await agentProfile1.save();
    await agentProfile2.save();

    console.log('⭐ Added agent reviews');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Sample Accounts:');
    console.log('Admin: admin@realestate.com / admin123');
    console.log('Agent 1: john@realestate.com / agent123');
    console.log('Agent 2: sarah@realestate.com / agent123');
    console.log('User 1: mike@example.com / user123');
    console.log('User 2: emily@example.com / user123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedData();
