const clc = require('cli-color'),
      _bb = clc.blackBright,
      _ma = clc.magentaBright,
      _ye = clc.yellowBright,
      _gr = clc.greenBright,

      Eta = require('node-eta'),
      LineByLineReader = require('line-by-line');


/*
  usage:
  TASK=store_records node index.js
*/
module.exports = [
  (options, next) => {
    options.c++;
    console.log(_ye(`\n${options.c}. `),_bb(`load`),'records file');
      
    let eta = new Eta(options.settings.store_records.expected);

    let lr = new LineByLineReader(options.settings.store_records.path);
    let memorial = {},
        types = {
          'Merged/Joint': 'M',
          'Translation': 'T',
          '': 'N' // normal
        };

    eta.start();

    lr.on('error', next);

    lr.on('line', function (line) {
      // pause emitting of lines...
      lr.pause();
      
      // split line on tab.
      let lines = line.split('\t')
      // collect lines
      let match_memorial = lines[0].match(/^(\d{4})\/(.*?)$/),
          match_recordid = lines[0].match(/^[\d\._]+$/);

      if(!match_memorial && !match_recordid){
        console.log(line)
        throw 'Pattern for memorial or record id not found. Line is not valid.'
      }
      // do transition babe.
      if (match_memorial) {
        // was there a previous, different memorial?
        if(!memorial.uid) {
          console.log(_bb('detected FIRST memorial:', _gr(match_memorial[2])));
        } else if(memorial.uid != match_memorial[2]){
          console.log(_bb('detected NEW memorial:', _gr(match_memorial[2]), '- flush previous:', _ye(memorial.uid)));
        
          console.log(_bb('flush memorial record for:', _ye(memorial.uid), '- queries:'), memorial.queue.length)
          // console.log(options.neo4j.queries)
          // console.log(memorial)
          
          options.neo4j.session.writeTransaction(tx => {
            memorial.queue.forEach(record => {
              let params = {
                record_uid:record.uid,
                memo_uid: memorial.uid
              };
              
              tx.run(options.neo4j.queries.create_record, params);   
            })
          }).then(res => {
            console.log(_gr('    v '), _bb('success.',eta.format('{{progress}}/1 eta: {{etah}}, elapsed: {{elapsed}} s')));
            memorial.queue = []
            memorial.uid   = match_memorial[2]
            memorial.year  = match_memorial[1]
            eta.iterate()
            lr.resume();
          }).catch(next)
          // return;
        }
        memorial.uid   = match_memorial[2]
        memorial.year  = match_memorial[1]
        memorial.queue = []
        // console.log(memorial)
      }

      if(match_recordid){
        // console.log(_bb('    - add record:'), line, match_recordid[0])
        let type = types[lines[lines.length-1]];
        if(!type){
          console.log(line)
          throw 'type not found'
        }
        memorial.queue.push({ uid: match_recordid[0], type: type})
        // console.log('go baby go.', match_recordid[0])
      }
      eta.iterate()
      lr.resume();
      
    });

    lr.on('end', function () {
      // All lines are read, file is closed now.
      console.log(_bb(`done `),'records file');
    
      next(null, options)
    });
  }
]