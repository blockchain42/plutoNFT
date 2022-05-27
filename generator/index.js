const { createCanvas, loadImage } = require('canvas');

// Main dir for NFT parts
const assetsDir = 'assets';
// NFT image dimensions
const height = 600;
const width = 600;
// last generated file name
let lastImageName = 'test.jpeg';

const express = require('express');
const app = express();
var bodyParser = require('body-parser');
const cors = require('cors');

// FS
const fs = require('fs');

// asset directory and files array
let directories = scanRootDir(assetsDir);

// function scans all directories in root dir
function scanRootDir(rootDir) {
  let dirs = new Array();
  fs.readdirSync(rootDir).forEach((dir) => {
    let files = new Array();
    files.push(dir);
    fs.readdirSync(rootDir + '/' + dir).forEach((file) => {
      files.push(file);
    });
    dirs.push(files);
  });
  return dirs;
}

// Creates random composition image from layers
function generateNFT(imageName) {
  const writeStream = fs.createWriteStream(
    '../react-ui/public/assets/' + imageName,
  );
  // Canvas setup
  const canvas = createCanvas(width, height);
  const canvasContext = canvas.getContext('2d');
  const jpegStream = canvas.createJPEGStream({
    quality: 0.95,
    chromaSubsampling: false,
  });

  // generated image from directories - each directory creates one layer
  directories.forEach((i, current) => {
    let imageIndex = Math.floor(Math.random() * (i.length - 1));
    imageIndex++;
    loadImage(assetsDir + '/' + i[0] + '/' + i[imageIndex]).then((image) => {
      // random image added like next layer
      canvasContext.drawImage(image, 0, 0, width, height);
      if (current == directories.length - 1) {
        jpegStream.pipe(writeStream);
      }
    });
  });
}
app.use(cors({ origin: '*' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Generates new image from post req
app.post('/api/generate/', async function (req, res) {
  const nft = req.body.nft;
  console.log(nft);
  const imageName = nft.assetName + '.jpeg';
  await generateNFT(imageName);
  return res.send(
    'NFT image ' + nft.assetName + '.jpeg has been created successfully.',
  );
});

// starting express on port
let port = 3042;
app.listen(port, () =>
  console.log('NFT image generating App - listening on port ' + port),
);
