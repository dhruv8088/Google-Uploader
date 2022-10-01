const express=require('express');
const app=express();
const hbs=require('hbs');
const fs=require("fs");
const {google}=require('googleapis');
const OAuth2Data= require("./credentials.json");
// multer is a library to upload images
const multer=require("multer");
const client_id= OAuth2Data.web.client_id;
const client_secret=OAuth2Data.web.client_secret;
const redirect_uri=OAuth2Data.web.redirect_uris[0];
var name,pic;
const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
)
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";
var auth=false;

app.set("view engine","hbs");

// for getting lognin or register

app.get('/',(req,res)=>{
    if(!auth){
        var url=oAuth2Client.generateAuthUrl({
            access_type:'offline',
            scope:SCOPES
           
        })
        console.log(url);
        res.render("index",{url:url});
    }
    else{
          var oauth2=google.oauth2({
            auth:oAuth2Client,
            version:'v2'
          })

          // for user info
          oauth2.userinfo.get((err,resp)=>{
            if(err) {
                console.log(err);
            }
            
            console.log(resp.data);
            name=resp.data.name;
            pica=resp.data.picture;
            res.render("success",{name:name,pic:pica,success:"Image_Uploading"});
          })
    }
})

// for getting the api 

app.get('/google/callback',(req,res)=>{
    const code=req.query.code;
    if(code){
        oAuth2Client.getToken(code,(err,token)=>{
            if(err){
                console.log("an error occured");
                console.log(err);
            }
            else{
                console.log("Successfully authenticated");
                console.log(token);
                oAuth2Client.setCredentials(token);
                auth=true;
                res.redirect("/");
            }
        });
    }
})

// for uploading and posting images. for this first we will find the image path and put it into images folder 
// and then upload it to google drive

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, "./images");
    },
    filename: function (req, file, callback) {
      callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
  });

  var upload = multer({
    storage: Storage,
  }).single("file"); //Field name and max count


app.post('/upload',(req,res)=>{
   upload(req,res,(err)=>{
          if(err) throw err
          console.log(req.file.path);   
          const drive=google.drive({
            version:'v3',
            auth:oAuth2Client
        
          })   
          const filemetadata={
               name:req.file.filename
          }
          const media={
            mimeType:req.file.mimetype,
        // it is used to recognize the filetype of a file sent to webserver using html.
            body: fs.createReadStream(req.file.path)
          }

          drive.files.create({
            resource:filemetadata,
            media:media,
            fields:"id"
          },(err,file)=>{
            if(err) throw err
            // else the file is successfully uploaded

            // after uploading the file we need to delete it from images folder
            fs.unlinkSync(req.file.path);
            res.render("success",{name:name,pic:pic,success:"Image_Uploaded" });
          })
   })
})

// for logout
 
app.get('/logout',(req,res)=>{
    auth=false;
    res.redirect('/');
})


app.listen(9000,()=>{
    console.log("app started on port 9000");
})