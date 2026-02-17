const fs = require('fs');
const path = require('path');
require('dotenv').config();
const connectDB = require('../database/connectDB');
const Blog = require('../models/blogModel');

function formatDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  return new Date(d).toISOString().slice(0, 10);
}

function buildUrlEntry(loc, lastmod, changefreq = 'weekly', priority = '0.8') {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function generateSitemaps(options = {}) {
  const rootFrontend = path.resolve(__dirname, '..', '..', 'frontend');
  const blogPath = path.join(rootFrontend, 'sitemap-blog.xml');
  const mainPath = path.join(rootFrontend, 'sitemap-main.xml');
  const servicesPath = path.join(rootFrontend, 'sitemap-services.xml');
  const indexPath = path.join(rootFrontend, 'sitemap.xml');

  await connectDB();

  const today = new Date().toISOString().slice(0, 10);

  // --- Blogs ---
  const blogs = await Blog.find({ published: true }).select('slug customUrl updatedAt publishedAt createdAt').lean();

  const blogUrls = blogs.map((b) => {
    const slugPart = (b.customUrl && b.customUrl.trim().length) ? b.customUrl.replace(/^\//, '') : b.slug;
    const loc = `https://www.socialbureau.in/blogs/${slugPart}`;
    const lastmod = formatDate(b.updatedAt || b.publishedAt || b.createdAt);
    return buildUrlEntry(loc, lastmod, 'weekly', '0.8');
  });

  const blogXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blogUrls.join('\n')}\n</urlset>`;
  fs.writeFileSync(blogPath, blogXml, 'utf8');

  // --- Main (static) ---
  const mainStatic = [
    { loc: 'https://www.socialbureau.in/', changefreq: 'daily', priority: '1.0' },
    { loc: 'https://www.socialbureau.in/services', changefreq: 'weekly', priority: '0.9' },
    { loc: 'https://www.socialbureau.in/blog', changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://www.socialbureau.in/careers', changefreq: 'monthly', priority: '0.7' },
    { loc: 'https://www.socialbureau.in/about', changefreq: 'monthly', priority: '0.8' },
    { loc: 'https://www.socialbureau.in/contact', changefreq: 'monthly', priority: '0.8' },
    { loc: 'https://www.socialbureau.in/privacy-policy', changefreq: 'yearly', priority: '0.6' },
    { loc: 'https://www.socialbureau.in/cookie-policy', changefreq: 'yearly', priority: '0.5' },
    { loc: 'https://www.socialbureau.in/disclaimer', changefreq: 'yearly', priority: '0.5' },
    { loc: 'https://www.socialbureau.in/our-team', changefreq: 'monthly', priority: '0.6' },
    { loc: 'https://www.socialbureau.in/partners', changefreq: 'monthly', priority: '0.5' },
    { loc: 'https://www.socialbureau.in/leaderboard', changefreq: 'monthly', priority: '0.4' }
  ];

  const mainEntries = mainStatic.map(s => buildUrlEntry(s.loc, today, s.changefreq, s.priority));
  const mainXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mainEntries.join('\n')}\n</urlset>`;
  fs.writeFileSync(mainPath, mainXml, 'utf8');

  // --- Services (attempt to preserve existing list if file exists) ---
  let servicesEntries = [];
  try {
    if (fs.existsSync(servicesPath)) {
      // read existing and extract locs
      const raw = fs.readFileSync(servicesPath, 'utf8');
      const locs = Array.from(raw.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
      servicesEntries = locs.map(loc => buildUrlEntry(loc, today, 'monthly', '0.9'));
    }
  } catch (err) {
    // fallback: leave services empty
    servicesEntries = [];
  }

  const servicesXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${servicesEntries.join('\n')}\n</urlset>`;
  fs.writeFileSync(servicesPath, servicesXml, 'utf8');

  // --- Sitemap index ---
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>https://www.socialbureau.in/sitemap-main.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>https://www.socialbureau.in/sitemap-services.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n  <sitemap>\n    <loc>https://www.socialbureau.in/sitemap-blog.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n</sitemapindex>`;
  fs.writeFileSync(indexPath, indexXml, 'utf8');

  console.log('Sitemaps generated: ', { blogPath, mainPath, servicesPath, indexPath });
}

module.exports = generateSitemaps;

if (require.main === module) {
  generateSitemaps().catch(err => {
    console.error('generateSitemaps failed', err);
    process.exit(1);
  });
}
