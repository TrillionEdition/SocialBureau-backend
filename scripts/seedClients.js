const mongoose = require('mongoose');
const Client = require('../models/clientModel');
require('dotenv').config();

const realClients = [
  {
    first_name: 'Social',
    last_name: 'Bureau',
    email: 'contact@socialbureau.in',
    phone: '+91-8714-952-665',
    company_name: 'Social Bureau',
    industry: 'Marketing & Digital Agency',
    website_url: 'https://socialbureau.in',
    current_marketing_description: 'Leading API-driven marketing ecosystem builder',
    monthly_budget_range: '$50,000+',
    currency: 'INR',
    timeline_to_start: 'Immediate',
    status: 'closed_won',
    goals: ['brand_awareness', 'lead_generation', 'sales'],
    channels: ['social_media', 'content_marketing', 'paid_ads']
  },
  {
    first_name: 'Trillion',
    last_name: 'Edition',
    email: 'contact@trillionedition.com',
    phone: '+91-9876543210',
    company_name: 'Trillion Edition LLP',
    industry: 'Technology & Innovation',
    website_url: 'https://trillionedition.com',
    current_marketing_description: 'Building the world\'s first API-driven marketing ecosystem',
    monthly_budget_range: '$100,000+',
    currency: 'INR',
    timeline_to_start: 'Immediate',
    status: 'closed_won',
    goals: ['brand_awareness', 'lead_generation', 'sales', 'engagement'],
    channels: ['social_media', 'email_marketing', 'paid_ads', 'content_marketing']
  },
  {
    first_name: 'Business',
    last_name: 'Bureau',
    email: 'info@businessbureau.co',
    phone: '+91-9123456789',
    company_name: 'Business Bureau',
    industry: 'Consulting & Business Services',
    website_url: 'https://businessbureau.co',
    current_marketing_description: 'Strategic business solutions and consulting',
    monthly_budget_range: '$25,000-$50,000',
    currency: 'INR',
    timeline_to_start: 'Within 2 weeks',
    status: 'closed_won',
    goals: ['lead_generation', 'brand_awareness'],
    channels: ['social_media', 'content_marketing']
  },
  {
    first_name: 'Renai',
    last_name: 'Hotels',
    email: 'marketing@renaihotels.com',
    phone: '+91-4842350000',
    company_name: 'Renai Hotels & Resorts',
    industry: 'Hospitality & Tourism',
    website_url: 'https://renaihotels.com',
    current_marketing_description: 'Premium hospitality and resort management',
    monthly_budget_range: '$10,000-$25,000',
    currency: 'INR',
    timeline_to_start: 'Within 1 month',
    status: 'closed_won',
    goals: ['brand_awareness', 'engagement'],
    channels: ['social_media', 'content_marketing', 'influencer']
  },
  {
    first_name: 'Ajnora',
    last_name: 'Digital',
    email: 'contact@ajnora.io',
    phone: '+91-9876543211',
    company_name: 'Ajnora Digital Solutions',
    industry: 'Software & Technology',
    website_url: 'https://ajnora.io',
    current_marketing_description: 'Digital solutions and software development',
    monthly_budget_range: '$15,000-$40,000',
    currency: 'INR',
    timeline_to_start: 'Immediate',
    status: 'closed_won',
    goals: ['lead_generation', 'brand_awareness', 'sales'],
    channels: ['social_media', 'content_marketing', 'paid_ads']
  },
  {
    first_name: 'Media',
    last_name: 'Innovations',
    email: 'hello@mediainnovations.com',
    phone: '+91-8765432109',
    company_name: 'Media Innovations Ltd',
    industry: 'Media & Entertainment',
    website_url: 'https://mediainnovations.com',
    current_marketing_description: 'Cutting-edge media and content production',
    monthly_budget_range: '$20,000-$60,000',
    currency: 'INR',
    timeline_to_start: 'Within 2 weeks',
    status: 'closed_won',
    goals: ['brand_awareness', 'engagement', 'lead_generation'],
    channels: ['social_media', 'content_marketing', 'influencer']
  },
  {
    first_name: 'Tech',
    last_name: 'Ventures',
    email: 'partnerships@techventures.in',
    phone: '+91-9234567890',
    company_name: 'Tech Ventures India',
    industry: 'Technology & Startups',
    website_url: 'https://techventures.in',
    current_marketing_description: 'Venture capital and startup ecosystem builder',
    monthly_budget_range: '$30,000-$75,000',
    currency: 'INR',
    timeline_to_start: 'Immediate',
    status: 'closed_won',
    goals: ['lead_generation', 'brand_awareness', 'engagement'],
    channels: ['social_media', 'email_marketing', 'content_marketing']
  },
  {
    first_name: 'Brand',
    last_name: 'Catalyst',
    email: 'info@brandcatalyst.co',
    phone: '+91-8976543210',
    company_name: 'Brand Catalyst Agency',
    industry: 'Branding & Creative',
    website_url: 'https://brandcatalyst.co',
    current_marketing_description: 'Premium branding and creative agency',
    monthly_budget_range: '$25,000-$100,000',
    currency: 'INR',
    timeline_to_start: 'Immediate',
    status: 'closed_won',
    goals: ['brand_awareness', 'lead_generation', 'sales'],
    channels: ['social_media', 'content_marketing', 'paid_ads', 'influencer']
  }
];

async function seedClients() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/socialbureau');
    console.log('Connected to MongoDB');

    // Clear existing test data (optional - comment out to preserve existing data)
    // await Client.deleteMany({});
    // console.log('Cleared existing clients');

    // Insert real clients
    const inserted = await Client.insertMany(realClients);
    console.log(`✅ Successfully seeded ${inserted.length} real clients`);
    
    // Display inserted clients
    console.log('\nInserted Clients:');
    inserted.forEach(client => {
      console.log(`  - ${client.company_name} (${client.email})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding clients:', error.message);
    process.exit(1);
  }
}

seedClients();
