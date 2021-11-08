const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Xuan Hung API',
    description: 'Description',
  },
  host: 'hw3-restful-api.herokuapp.com',
  // host: 'localhost:4000',
  schemes: ['https', 'http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['index.js'];

/* NOTE: if you use the express Router, you must pass in the 
   'endpointsFiles' only the root file where the route starts,
   such as index.js, app.js, routes.js, ... */

swaggerAutogen(outputFile, endpointsFiles, doc);