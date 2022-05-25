require('dotenv').config();

const server = require('./server');

server({ port: process.env.PORT })
  .then(() => console.log(`Listening on port ${process.env.PORT}`))
  .catch((err) => console.log('Server error', { err }));
