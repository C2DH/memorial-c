const Eta   = require('node-eta');

module.exports = [
  // get the list of the contents folder
  (options, next) => {
    c++;
    console.log(_ye(`\n${c}. `),_bb(`get all glob nodes`))
    
    glob(settings.glob.path, {}, (err, files) => {
      if(err)
        next(err)
      else{
        console.log(_gr('    v '), _bb('success.'), files.length, _bb('files found.'));
        next(null, files)
      }
    })
  },
  (files, next) => {
    c++;
    console.log(_ye(`\n${c}. `),_bb(`save nodes according to json files.`))
    // one memorialc per file.

    let q = async.queue((filepath, callback) => {
      let n = {
        uid: path.basename(filepath, settings.glob.ext),
        year: path.dirname(filepath).split('/').pop()
      }
      console.log(_bb('    '),filepath, _bb('->'), n.uid);
      
      let q = query.memo.merge;
      session.run(q, n)
        .then(res => {
          let node = res.records[0]._fields[0];
          console.log(_gr('    v '), _bb('created'), node.properties.uid, _bb('labelled as'), node.labels );
          callback();
          
        })
        .catch(err => {
          q.kill()
          next(err)
        });
      
    })
    q.push(files)
    q.drain = next;
  }
];