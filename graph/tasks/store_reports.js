const clc = require('cli-color'),
      _bb = clc.blackBright,
      _ma = clc.magentaBright,
      _ye = clc.yellowBright,
      _gr = clc.greenBright,

      Eta = require('node-eta'),
      LineByLineReader = require('line-by-line');

module.exports = [
  (options, next) => {
    options.c++;
    console.log(_ye(`\n${options.c}. `),_bb(`load`),'reports file');
      
    let eta = new Eta(options.settings.store_reports.expected);

    let lr = new LineByLineReader(options.settings.store_reports.path);
    let memorial = {};

    eta.start();

    lr.on('error', next);

    lr.on('line', function (line) {
      // pause emitting of lines...
      lr.pause();
      
      // collect lines
      let match_memorial = line.match(/^(\d{4})\/(.*?)$/),
          match_reportid = line.match(/^[\d_]+$/);

      // do transition babe.
      if (match_memorial) {
        // was there a previous, different memorial?
        if(memorial.uid && memorial.uid != match_memorial[2]){
          console.log(_bb('flush memorial report for:', _ye(memorial.uid), '- queries:'), memorial.queue.length)
          // console.log(options.neo4j.queries)
          
          options.neo4j.session.writeTransaction(tx => {
            memorial.queue.forEach(record_uid => {
              tx.run(options.neo4j.queries.create_record, {
              //   record_uid:record_uid
              // });
              // tx.run(options.neo4j.queries.merge_relationship_record_memo, {
                record_uid:record_uid,
                memo_uid: memorial.uid
              });   
            })
          }).then(res => {
            console.log(_gr('    v '), _bb('success.',eta.format('{{progress}}/1 eta: {{etah}}, elapsed: {{elapsed}} s')));
            eta.iterate()
            lr.resume();
          }).catch(next)
          return;
        }
        memorial.uid   = match_memorial[2]
        memorial.year  = match_memorial[1]
        memorial.queue = []

      }

      if(!match_reportid){
        // company names etc, just skip.
      } else {
        if(!memorial.uid){
          throw 'error error'
        }
        // console.log(_bb('    - add report:'), line, match_reportid[0])
        memorial.queue.push(match_reportid[0])
// console.log('go baby go.', match_reportid[0])
      }
      eta.iterate()
      lr.resume();
      
    });

    lr.on('end', function () {
      // All lines are read, file is closed now.
      console.log(_bb(`done `),'reports file');
    
      next(null, options)
    });
  }
]