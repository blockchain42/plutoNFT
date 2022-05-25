
const axios = require('axios');
let port = 3042; // generator port

axios

  // Call generate
  .post('http://localhost:'+port+'/api/generate', {
        "nft": {
           "id": 1,
            "collection": "Cleverlance Honzici",
            "assetName" : "Honzik003",
        }
  })

  // Call for generated image
  /*
  .post('http://localhost:'+port+'/api/getimage', {
        "nft": {
           "id": 1,
            "collection": "Cleverlance Honzici",
            "assetName" : "Honzik001",
        }
  })
  */
  
  .then(res => {
    console.log(res.data);
  })
  .catch(error => {
    console.error(error);
  });
