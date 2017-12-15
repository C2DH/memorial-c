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
    console.log(_ye(`\n${options.c}. `),_bb(`load`),'mapping file');
    
    // based on expected number of lines of the mappings file (wc -l ;)
    let eta = new Eta(options.settings.store_records.expected);
    let lr = new LineByLineReader(options.settings.store_records.path);
    let memorial = {};

    eta.start();

    lr.on('error', next);
    lr.on('line', function (line) {
      // pause emitting of lines...
      lr.pause();
      
      // split line on tab.
      // console.log(line)
      let lines = line.split('\t')
      // collect lines
      let match_memorial  = lines[0].match(/^(\d{4})\/(.*?)$/),
          match_recordid  = lines[0].match(/^[\d\._]+$/),
          match_mentionid = lines.length > 1? lines[1].match(/^[A-Z\d \._;]+$/): null;
      
      if(!match_memorial && !match_recordid){
        console.log(line)
        throw 'Pattern for memorial or record id not found. Line is not valid.'
      }

      if (match_memorial) {
        let _uid  = match_memorial[1]+'-'+match_memorial[2],
            _year = match_memorial[1];
        // was there a previous, different memorial?
        if(!memorial.uid) {
          console.log(_bb('detected FIRST memorial:', _gr(_uid)));
        } else if(memorial.uid != _uid){
          console.log(_bb('detected NEW memorial:', _gr(_uid), '- flush previous:', _ye(memorial.uid)));
        
          console.log(_bb('flush memorial report for:', _ye(memorial.uid), '- queries:'), memorial.queue.length)
          // console.log(options.neo4j.queries)
          
          options.neo4j.session.writeTransaction(tx => {
            memorial.queue.forEach(params => {
              tx.run(options.neo4j.queries.create_mention, params);   
            })
          }).then(res => {
            console.log(_gr('    v '), _bb('success.',eta.format('{{progress}}/1 eta: {{etah}}, elapsed: {{elapsed}} s')));
            memorial.queue = []
            memorial.uid   = _uid
            memorial.year  = _year
            eta.iterate()
            lr.resume();
          }).catch(next)
          return;
        }
        memorial.uid   = _uid
        memorial.year  = _year
        memorial.queue = []
        // console.log(memorial)
      }


      eta.iterate()
      if(match_recordid && match_mentionid) {
        let mentions = match_mentionid[0]
          .split(';')
          .filter(d => d.trim().length > 0)
          .map(d => {
            return {
              record_uid: memorial.uid+'-'+match_recordid[0],
              mention_uid: d.trim()
            }
          });
        // console.log(match_recordid[0],mentions)
        memorial.queue = memorial.queue.concat(mentions)
      }
      
      
      lr.resume();
      
    });

    lr.on('end', function () {
      // All lines are read, file is closed now.
      console.log(_bb(`done `),'records file');
    
      next(null, options)
    });
  }
]