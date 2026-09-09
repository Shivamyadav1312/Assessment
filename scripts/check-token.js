require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWExNWZkMTZjNThkMzczOThlNGJhNDciLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJpYXQiOjE3ODg5NjA3NTQsImV4cCI6MTc4OTU2NTU1NH0._q0GZNXaMsksiOmW9AbxcQuDHsOg4Ul8-3ZI5Uj-r0o";

console.log('JWT_SECRET from .env:', process.env.JWT_SECRET);
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  console.log('Decoded successfully:', decoded);
} catch (e) {
  console.log('Verification error with .env JWT_SECRET:', e.message);
}
