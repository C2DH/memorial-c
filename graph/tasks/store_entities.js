const clc = require('cli-color'),
      _bb = clc.blackBright,
      _ma = clc.magentaBright,
      _ye = clc.yellowBright,
      _gr = clc.greenBright,

      async     = require('async'),
      glob      = require("glob"),
      LineByLineReader = require('line-by-line'),
      Eta = require('node-eta');


module.exports = [
  // get the list of the contents folder
  (options, next) => {
  try{
    function chunk(a, l) { 
      if (a.length == 0) return []; 
      else return [a.slice(0, l)].concat(chunk(a.slice(l), l)); 
    }

    options.c++;
    console.log(_ye(`\n${options.c}. `),_bb(`load`),'NER mapping file');
    
    let lr = new LineByLineReader(options.settings.store_entities.path);
    let queue = [],
        eta,
        previous_uid;

    function drain(_uid, callback){
      console.log(_bb('detected NEW:', _gr(_uid)));
      console.log(_bb('flush:', _ye(previous_uid), '- n. queries:'), queue.length)
      
      options.neo4j.session.writeTransaction(tx => {
        queue.forEach(params => {
          // console.log('create_'+params.type, params,options.neo4j.queries['create_'+params.type])
          tx.run(options.neo4j.queries['create_'+params.type], params);   
        })
      })
        .then(callback)
        .catch(next)
    };

    lr.on('error', next);

    lr.on('line', function (line) {
      // pause emitting of lines...
      lr.pause();

      // split line on tab.
      let lines = line.split('\t')
      
      let match_record = lines[0].match(/^(\d{4})\/(.*)\/([^\/]+)$/);
      
      if(lines.length < 4){
        console.log(_ma('ERR LINES SPLIT!'), lines, _ye('   ', line))
        lr.resume();
        return;
      } 

      if(!match_record ){
        console.log(_ma('ERR PATTERN NOT MATCH!'), _ye('   ', line), '\n\n')
        throw 'record id not matching....';
      }


      let year        = match_record[1],
          memo_name   = match_record[2],
          record_name = match_record[3],
          record_uid  = [year, memo_name, record_name].join('-'),

          params      = {},
          name        = lines[1],
          type        = lines[2].toLowerCase(),
          entity_uid  = type + '-' + lines[1].toLowerCase(),
          splitpoints = lines[3].split(/[;,]/).filter(d=> d.length > 0).map(d => parseInt(d))

      if(previous_uid && record_uid != previous_uid) {
        previous_uid = '' + record_uid;

        drain(record_uid, () => {
          queue = []
          lr.resume()
        });
        return;
      }

      previous_uid = '' + record_uid;

      params = {
        record_uid: record_uid,
        entity_uid: entity_uid,
        name: name,
        type: type,
        splitpoints: splitpoints
      }

      if(['person', 'organization', 'location'].indexOf(type) !== -1){
        queue.push(params);
      }
      lr.resume();
    });

    lr.on('end', function () {
      drain(previous_uid);
      console.log(_gr('    v '), _bb('success!'));
      next(null, options);
    });

    
  } catch(e) {
    next(e)
    // next()
  }
  }
]