module.exports = ({ blog, job }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

    <h2 style="color:#000;"> Latest Blog</h2>

    ${blog?.image ? `
      <img src="${blog.image}"
           alt="${blog.title}"
           style="width:100%; border-radius:8px; margin-bottom:16px;" />
    ` : ""}

    <h3>${blog.title}</h3>

    ${blog.excerpt ? `<p>${blog.excerpt}</p>` : ""}

    <a href="https://www.socialbureau.in/blogs/${blog.slug}"
       style="display:inline-block;margin:12px 0;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
      Read Full Blog →
    </a>

    <hr style="margin:32px 0;" />

    ${job ? `
      <h2 style="color:#000;">💼 Latest Job Opening</h2>

      <h3>${job.title}</h3>

      <p>
        <strong>${job.department}</strong> • ${job.employment}<br/>
        ${job.location || ""}
      </p>

      <p>${job.description}</p>

      <a href="https://www.socialbureau.in/careers/${job.slug}"
         style="display:inline-block;margin:12px 0;padding:10px 20px;background:#d00000;color:#fff;text-decoration:none;border-radius:6px;">
        View Job →
      </a>
    ` : ""}

    <hr style="margin:24px 0;" />

    <p style="font-size:12px;color:#999;">
      You’re receiving this update from SocialBureau.
    </p>
  </div>
`;
