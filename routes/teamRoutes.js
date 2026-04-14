const express = require("express");
const teamRoutes = express.Router();
const { getCache, setCache, CACHE_EXPIRY } = require("../utils/Cacheutils");

/**
 * Static team data — served via Redis-cached API endpoint.
 * Update this object whenever team composition changes;
 * the cache will be automatically refreshed on next request
 * after TTL expires, or hit POST /team/invalidate to bust it immediately.
 */
const TEAM_DATA = {
  leadership: [
    {
      name: "Alen Jacob",
      link: "https://www.linkedin.com/in/alen-jacob-695a99184",
      role: "Managing Director",
      description:
        "Visionary leader driving SocialBureau's automation-first, API-powered marketing approach.",
      image: "/assets/AlenJacob.webp",
      hoverImage: "/assets/AlenJacob.webp",
    },
    {
      name: "Sham SK",
      link: "https://shamsk.vercel.app",
      role: "CEO & Managing Director",
      description:
        "Leads innovation-led marketing architecture and oversees project execution & partnerships.",
      image: "/assets/ShamSK.webp",
      hoverImage: "/assets/ShamSK.webp",
    },
  ],
  finance: [
    {
      name: "Keerthana",
      role: "Accountant",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1765443202/images/uytbxoupcmslyxf74fzd.png",
      hoverImage:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1765443202/images/uytbxoupcmslyxf74fzd.png",
      description:
        "Oversees budgeting, ledger management, and financial statements to support business decisions.",
    },
  ],
  strategyMarketing: [
    {
      name: "Sherin Joseph",
      role: "COO & HR",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1761195483/SB_ID_Card_Sherin_New_wtgfyo.png",
      hoverImage: "/assets/sherin.webp",
      description: "Drives talent acquisition & creative alignment ensuring brand consistency.",
    },
    {
      name: "Hajira",
      role: "Administration & CMO",
      description: "Ensures flawless daily operations and inter-department workflow excellence.",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1768816875/SB_ID_Card_Hajira_lrmfvk.png",
      hoverImage: "/assets/hajira.webp",
    },
    {
      name: "Mohammed Shereef",
      role: "PMO",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1770974355/images/wodx1jeooonrc8yi0fib.jpg",
      hoverImage:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1770974355/images/wodx1jeooonrc8yi0fib.jpg",
      description: "Ensures every project connects vision to execution and strategy to outcomes.",
    },
    {
      name: "Amal",
      role: "Digital Marketer",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1766495417/images/nd8whdzhbwwsqzjhhfaj.jpg",
      hoverImage: "/assets/aneek.webp",
      description: "Leads paid media & performance strategies across global ad ecosystems.",
    },
    {
      name: "Rachel Susan oommen",
      role: "HR Asst",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1770037177/images/af8xbvarrsehbzcxjylq.jpg",
      hoverImage:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1770037177/images/af8xbvarrsehbzcxjylq.jpg",
      description:
        "Detail-oriented HR Assistant experienced in administrative support, onboarding, and employee coordination",
    },
  ],
  contentProduction: [
    {
      name: "Gino Abraham",
      role: "Cinematographer",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1773056139/ID_Card_gino-01_vmxq5p.jpg",
      hoverImage:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1773056139/ID_Card_gino-01_vmxq5p.jpg",
      description: "Responsible for visual direction on shoots using Sony A7M4 + DJI systems.",
    },
    {
      name: "Taijo John",
      role: "Graphic Designer",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1762493545/SB_ID_Card_Taijo_New_1_-1_eb0ygm.jpg",
      hoverImage: "/assets/taijo.webp",
      description: "Creates visual experiences that improve clarity, recall, and conversion.",
    },
    {
      name: "Joseph",
      role: "Video Editor",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1763380488/images/fnzkzrdkb3f8cli8583p.png",
      hoverImage: "/assets/joseph.webp",
      description: "Narrative-driven editor skilled in 4K workflows, color grading, and motion.",
    },
  ],
  technology: [
    {
      name: "Elizebath Thomas",
      role: "Senior Web Developer",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1762493913/team5_zlamx7.webp",
      hoverImage: "/assets/elizebath.webp",
      description: "Builds React-based digital infrastructure & API integrations for automation.",
    },
    {
      name: "Reshma Vijayan",
      role: "Web Developer",
      hoverImage:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1770036743/images/w4eogtldwfqtsoxl94tl.jpg",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1770036743/images/w4eogtldwfqtsoxl94tl.jpg",
      description:
        "Web Developer skilled in developing reliable, responsive, and visually appealing websites",
    },
    {
      name: "Hasna",
      role: "Asst Web Developer",
      hoverImage:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1764580735/images/p6piwfsx26mqv3vd6eoz.png",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1764580735/images/p6piwfsx26mqv3vd6eoz.png",
      description: "Engineering modern ecosystems with intelligent API-driven automation.",
    },
  ],
  exemployee: [
    {
      name: "Aneek",
      role: "Performance Marketing Team Head",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1761281558/images/bsa5x1ay2qrdoryvxaty.png",
    },
    {
      name: "Anjay Ramesh",
      role: "Content Writer & Production Lead",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1761195484/SB_ID_Card_Anjay_New_bbobhw.png",
    },
    {
      name: "Afnas N",
      role: "Cinematographer",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1761030913/images/kuktmap7exgze81z2afh.png",
    },
    {
      name: "Gowri Pradeep",
      role: "Creative Director",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1773056139/ID_Card_all_Team-15_1_tajdxo.jpg",
    },
    {
      name: "Muhasin",
      role: "SEO Specialist and Performance Marketer",
      image:
        "https://res.cloudinary.com/dtwcgfmar/image/upload/v1766494424/images/iy29fzregdmfohgjc3pr.jpg",
    },
  ],
};

const TEAM_CACHE_KEY = "team:all";
// Team data is essentially static — cache for 24 hours
const TEAM_CACHE_TTL = 60 * 60 * 24;

/**
 * GET /team
 * Returns all team sections. Response is cached in Redis for 24 hours.
 * Falls back gracefully to the raw object if Redis is unavailable.
 */
teamRoutes.get("/", async (req, res) => {
  try {
    // 1. Try cache first
    const cached = await getCache(TEAM_CACHE_KEY);
    if (cached) {
      return res.json({ success: true, source: "cache", data: cached });
    }

    // 2. Cache miss — serve the static data and prime the cache
    await setCache(TEAM_CACHE_KEY, TEAM_DATA, TEAM_CACHE_TTL);

    return res.json({ success: true, source: "origin", data: TEAM_DATA });
  } catch (err) {
    console.error("GET /team error:", err);
    // Graceful fallback — always serve data even if Redis is down
    return res.json({ success: true, source: "fallback", data: TEAM_DATA });
  }
});

/**
 * POST /team/invalidate
 * Busts the team Redis cache so the next GET re-primes it.
 * Useful after updating team data in code; no auth required in dev,
 * add middleware for production if desired.
 */
teamRoutes.post("/invalidate", async (req, res) => {
  try {
    const { invalidateCache } = require("../utils/Cacheutils");
    await invalidateCache(TEAM_CACHE_KEY);
    return res.json({ success: true, message: "Team cache invalidated" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = teamRoutes;
