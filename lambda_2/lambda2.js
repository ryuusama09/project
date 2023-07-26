const express = require("express");
const mysql = require("mysql");
const serverless = require("serverless-http");
const { v4: uuidv4Generator } = require("uuid");
const app = express();
const fs = require("fs");
const cors = require("cors");
const mysqlQuery = require("../sql");
const connectionHelper = require("../mysqlHelper");
const bodyParser = require("body-parser");
const multer = require("multer");
const AWS = require("aws-sdk");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
app.use(cors());
const PORT = 3004;

if (process.env.ENVIRONMENT === "lambda") {
  module.exports.handler = serverless(app);
} else {
  app.listen(PORT, () => {
    console.log("Hello");
  });
}

const uploadS3Img = async (req) => {
  const s3 = new AWS.S3();
  s3.config.update({
    accessKeyId: "AKIA47AMLKB3ZK5V5XF2",
    secretAccessKey: "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",
  });
  let links = [];
  // const filePath = "C:/Users/ryusama09/Downloads/back-2.avif";
  const files = req.files;
  console.log(files);
  const ids = req.body.imageIds.split(",");
  const classname = req.body.className;
  const params = {
    Bucket: "imgress-1",
    Body: "",
    Key: "",
  };
  for (let i = 0; i < files.length; i++) {
    const key = `${classname}/${ids[i]}`;
    params.Key = key;
    params.Body = files[i].buffer;
    await new Promise((resolve, reject) => {
      s3.upload(params, function (err, data) {
        if (err) {
          reject(err);
        } else {
          console.log(
            "File uploaded successfully. File location:",
            data.Location
          );
          //res.status(200).send(data.Location)
          resolve(data.Location);
        }
      });
    }).then((link) => {
      links.push(link);
    });
  }
  return links;
};

const uploadTidb = async function (req, res) {
  // how can we upload imgs to imgdb
  // console.log(req.files, "hi", req.body);
  const links = await uploadS3Img(req);
  console.log(links, "hi");
  const className = req.body.className;
  const ids = req.body.imageIds.split(",");
  const engineID = '813144a5-0b1b-40a8-98d5-c2fc3e75ad88'
  console.log(ids, className, engineID);
  const sql ="insert into imageData(engineId , image , className) values ( ? , ? , ?)";
  let values = [];
  let connection = connectionHelper;
  connection.config.database = "imgdb";
  for (let i = 0; i < ids.length; i++) {
    values.push(engineID);
    values.push(links[i]);
    values.push(className);
    console.log(values)
    await mysqlQuery(connection ,sql , values).then((response , err)=>{
         if(err !== undefined){
            console.log(err)
            res.status(500).send('error')
         }
    });
  }
  if(res.headersSent !== true) {
    res.status(200).send('Hello World!');
}
};

const deleteS3container = async function (bucket, dir) {
  const listParams = {
    Bucket: bucket,
    Prefix: dir,
  };
  var s3 = new AWS.S3(params);
  s3.config.update({
    accessKeyId: "AKIA47AMLKB3ZK5V5XF2",
    secretAccessKey: "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",
  });
  const listedObjects = await s3.listObjectsV2(listParams).promise();

  if (listedObjects.Contents.length === 0) return;

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] },
  };

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key });
  });

  await s3.deleteObjects(deleteParams).promise();

  if (listedObjects.IsTruncated) await deleteS3container(bucket, dir);
};

const deleteS3Images = async function (req, res) {
  const s3 = new AWS.S3();
  s3.config.update({
    accessKeyId: "AKIA47AMLKB3ZK5V5XF2",
    secretAccessKey: "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",
  });
  const folder = req.body.classname;
  const params = {
    Bucket: "imgress-1",
    Key: `${folder}/filename.fileExtension`,
  };

  s3.deleteObject(params, (error, data) => {
    if (error) {
      res.status(500).send(error);
    }
    res.status(200).send("File has been deleted successfully");
  });
};

const deleteTidbContainers = async function (req, res) {
  const engineID = req.body.engineID;
  const sql = `delete from imageData where engineId = ${engineID}`;
  //const sqlfetch = `select * from imageData where engineId = ${engineID}`;
  const connection = connectionHelper;
  connection.config.database = "imgdb";
  try {
    mysqlQuery(connection, sql).then((responseNew) => {
      res.status(200).json({ success: true, responseNew });
    });
  } catch (err) {
    res.status(404).send(err);
  }
};

const deleteTidbImages = async function (req, res) {
  const connection = connectionHelper;
  let imageId;
  let sql = `delete from imageData where imageId = ${imageId}`;
  connection.config.database = "imgdb";
  for (let i = 0; i < req.body.imgList.length; i++) {
    imageId = req.body.imgList[i];
    try {
      mysqlQuery(connection, sql).then((responseNew) => {
        res.status(200).json({ success: true, responseNew });
      });
    } catch (err) {
      res.status(404).send(err);
    }
  }
};

app.get("/dev/", (req, res) => {
  res.send("HELLO");
});

app.get("/dev/welcome", (req, res) => {
  res.json({ message: "HARSH MC" });
});
app.post("/dev/deletetidbimg", async (req, res) => {
  deleteTidbImages(req, res);
});
app.post("/dev/deletetidbcont", async (req, res) => {
  deleteTidbContainers(req, res);
});
app.post("/dev/upload", upload.any(), async (req, res) => {
  uploadTidb(req, res);
});
