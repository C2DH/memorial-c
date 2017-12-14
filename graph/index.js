const path = require("path"),
      async     = require("async"),
      fs        = require("fs"),
      clc       = require('cli-color'),
      decypher  = require('decypher'),

      settings  = require('./settings'),

      query     = {
        memo: decypher('./queries/memo.cyp'),
      },

      _bb = clc.blackBright,
      _ma = clc.magentaBright,
      _ye = clc.yellowBright,
      _gr = clc.greenBright;

if(!process.env.TASK){
  console.log(_ma.bold('USAGE: TASK=<taskname> npm start'))
  console.log('.. where <taskname> should be the module name in ./tasks ... \n')
  return
}  

const queries  = require('decypher')('./queries.cyp'),
      neo4j    = require('neo4j-driver').v1,
      driver   = neo4j.driver(settings.neo4j.server, neo4j.auth.basic(settings.neo4j.auth.user, settings.neo4j.auth.password)),
      session  = driver.session()

      tasks    = require(`./tasks/${process.env.TASK}`);



if(!typeof tasks == 'object' || !tasks.length > 0) {
  console.log(`Please check task ${process.env.TASK}`)
  return;
};
console.log(_bb(`task: ${process.env.TASK}`));

let c = 0;


async.waterfall([
  (next) => {
    c++;
    console.log(_ye(`\n${c}. `),_bb(`test neo4j connection to:`), settings.neo4j.server)
    let q = 'MATCH (n) RETURN n LIMIT 1';
    // session.query(q)
    console.log(q)
    session.run(q, {
      limit: 10
    }).then(res => {
      console.log(_gr('    v '), _bb('success.'), res.records.length, _bb('records found.'));
      next(null, {
        c: c,
        settings: settings,
        neo4j:{
          session: session,
          queries: queries
        }
      });
    }).catch(next);
  },
].concat(tasks), (err) => {
  if(err)
    console.log('errore',err)
  else
    console.log(_bb(`---\nthat's all folks\n---`));
        
  session.close();
  driver.close();
});


