/*
  downloader
*/

const db        = require('diskdb'),
      fs        = require('fs'),
      path      = require('path'),
      request   = require('request'),
      async     = require('async'),
      sleep     = require('sleep'),
      settings  = require('./settings'),
      storage   = db.connect(settings.paths.contents, ['records']),

      STATUS_OK = 'ok',
      STATUS_ERR = 'err';


const pdfs = db.records.find();

console.log('total records: ', db.records.count())
console.log('done         : ', db.records.find({status: STATUS_OK}).length);

sleep.msleep(2000)

let q = async.queue((pdf, next) => {
  // console.log(pdf);

  // done already? skip.
  if(pdf.status == STATUS_OK){
    next();
    return;
  }
  // get year
  let year = 0;

  try{
    year = pdf.url.match(/\/(\d{4})\//)[1];
  } catch(err){
    q.kill();
    console.log(err);
    return;
  }


  let basedir = path.join(settings.paths.contents, year),
      filename = path.basename(pdf.url),
      filepath = path.join(basedir, filename);

  // create the year dir
  fs.mkdir(basedir, err => {
    if(err && err.code != 'EEXIST'){
      console.log(err)
      q.kill();
      return;
    }

    // start!
    console.log('\nPDF\n- url:', pdf.url, '\n- year:', year, '\n- path:', filepath);

    request
      .get(pdf.url)
      .on('error', (err) => {
        console.log(err)
        pdf.status = STATUS_ERR;
        db.records.update({
          _id: pdf._id
        }, pdf, {
          upsert: true
        });
        sleep.msleep(wait);
        next();
      })
      .on('response', (res) => {
        console.log('  ... status:',res.statusCode, '\n- content-type:', res.headers['content-type']) // 'image/png'
      })
      .on('end', (res) => {
        let wait = Math.round(1000*Math.random());
        console.log('  ... done. Remaining:',  q.length(), '\n- sleep (ms):', wait);

        pdf.status = STATUS_OK;

        // update temp table
        db.records.update({
          _id: pdf._id
        }, pdf, {
          upsert: true
        });

        // wait before launching
        sleep.msleep(wait);
        next();
      })
      .pipe(fs.createWriteStream(filepath))
  })
  
}, 1);

q.drain = () => {
  console.log('done')
};

q.push(db.records.find())