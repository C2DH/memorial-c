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
    console.log(_ye(c),_bb(`test neo4j connection`))
    let q = query.memo.get_nodes;
    // session.query(q)
    console.log(q)
    session.run(q, {
      limit: 10
    }).then(res => {
      console.log(_gr(' v '), _bb('success.'), res.records.length);
      next(null);
    }).catch(next);
  }
], (err) => {
  if(err)
    console.log(err)
  session.close();
  driver.close();
})


