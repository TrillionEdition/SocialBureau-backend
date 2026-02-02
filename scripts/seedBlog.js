require('dotenv').config();
const connectDB = require('../database/connectDB');
const Blog = require('../models/blogModel');

async function seed() {
  await connectDB();

  const existing = await Blog.findOne({ title: 'First post (seed)' });
  if (existing) {
    console.log('Seed blog already exists:', existing.slug);
    process.exit(0);
  }

  const blog = new Blog({
    title: 'First post (seed)',
    slug: 'first-post-seed-' + Date.now(),
    excerpt: 'This is a seeded first post for local testing',
    content: [
      {
        type: 'text',
        text: '<h2>Welcome</h2><p>This is a seed blog for testing likes and comments.</p>',
      },
    ],
    image: 'https://via.placeholder.com/1200x630.png?text=Seed+Image',
    category: 'general',
    authorName: 'Dev',
    published: true,
    seo: { title: 'Seed Post', description: 'Seed blog for testing' }
  });

  const saved = await blog.save();
  console.log('Created seed blog:', saved.slug);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});