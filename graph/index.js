const path = require("path"),
      async     = require("async"),
      fs        = require("fs"),
      glob      = require("glob"),
      clc       = require('cli-color'),
      decypher  = require('decypher'),

      settings  = require('./settings'),

      query     = {
        memo: decypher('./queries/memo.cyp'),
      },

      _bb = clc.blackBright,
      _ma = clc.magentaBright,
      _ye = clc.yellowBright,
      _gr = clc.greenBright,

      neo4j    = require('neo4j-driver').v1,
      driver   = neo4j.driver(settings.neo4j.server, neo4j.auth.basic(settings.neo4j.auth.user, settings.neo4j.auth.password)),
      session  = driver.session();


console.log(_bb('indexer...'));

let c = 0;

async.waterfall([
  (next) => {
    c++;
    console.log(_ye(`\n${c}. `),_bb(`test neo4j connection`))
    let q = query.memo.get_nodes;
    // session.query(q)
    console.log(q)
    session.run(q, {
      limit: 10
    }).then(res => {
      console.log(_gr('    v '), _bb('success.'), res.records.length, _bb('records found.'));
      next(null);
    }).catch(next);
  },

  // get the list of the contents folder
  (next) => {
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
], (err) => {
  if(err)
    console.log(err)
  else
    console.log(_bb(`---\nthat's all folks\n---`));
        
  session.close();
  driver.close();
})


