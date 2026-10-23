const USER_DETAIL_FIELDS = [
  "_id",
  "id",
  "name",
  "email",
  "role",
  "verification",
  "isEmployee",
  "exp",
  "doj",
  "title",
  "bio",
  "location",
  "avatar",
  "coverImage",
  "achievements",
  "reviews",
  "clients",
  "tools",
];

function safeUserDetails(user) {
  if (!user || typeof user !== "object") return user;

  const safeUser = {};
  for (const field of USER_DETAIL_FIELDS) {
    if (user[field] !== undefined) safeUser[field] = user[field];
  }
  return safeUser;
}

module.exports = safeUserDetails;
