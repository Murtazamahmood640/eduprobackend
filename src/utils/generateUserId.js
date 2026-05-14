/**
 * Shared utility to generate sequential user IDs.
 * ADM001, STU001, TNR001, etc.
 */
const User = require('../models/User');

const PREFIX_MAP = {
  admin: 'ADM',
  student: 'STU',
  teacher: 'TEA'
};

const generateUserId = async (role) => {
  const prefix = PREFIX_MAP[role] || 'USR';
  
  // Find the user with the highest ID for this role
  const lastUser = await User.findOne({ role, userId: new RegExp(`^${prefix}`) })
    .sort({ userId: -1 })
    .exec();

  let nextNum = 1;
  if (lastUser && lastUser.userId) {
    const lastNum = parseInt(lastUser.userId.replace(prefix, ''));
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  const paddedNum = String(nextNum).padStart(3, '0');
  return `${prefix}${paddedNum}`;
};

module.exports = { generateUserId };
