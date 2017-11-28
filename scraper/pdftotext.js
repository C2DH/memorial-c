const db        = require('diskdb'),
      fs        = require('fs'),
      path      = require('path'),
      spawn     = require('child_process').spawn,
      async     = require('async'),
      sleep     = require('sleep'),
      settings  = require('./settings'),
      storage   = db.connect(settings.paths.contents, ['records']),

      STATUS_OK = 'ok',
      STATUS_ERR = 'err';


// const pdfs = db.records.find();

console.log('total records: ', db.records.count())
// console.log('done         : ', db.records.find({txt: 'a'}).length);



sleep.msleep(1000)

let q = async.queue((pdf, next) => {
  // get year
  let year = 0;

  try{
    year = pdf.url.match(/\/(\d{4})\//)[1];
  } catch(err){
    q.kill();
    console.log(err);
    return;
  }


  let filename = path.basename(pdf.url),
      filepath = path.join(year, filename);

  console.log(filepath);
  
  pdf.path = filepath;
  
  let wait = Math.round(10*Math.random()) + 1;
  
  console.log('  ... done. Remaining:',  q.length(), '\n- sleep (ms):', wait);

  const ls = spawn('pdftotext', (['-nopgbrk', '-enc', 'UTF-8']).concat([path.join(settings.paths.contents, filepath)]));

  ls.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  ls.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    if(code != '0') {
      console.log(`child process exited with code ${code}`);
    } else {

      pdf.txt = path.join(year, path.basename(filepath, '.pdf') + '.txt')
      db.records.update({
        _id: pdf._id
      }, pdf, {
        upsert: true
      });

      next();
    }
  });

}, 1);

q.drain = () => {
  console.log('done')
};

// q.push(db.records.find().filter(d => {
//   return d.txt != 'a'
// }));

q.push(db.records.find());
