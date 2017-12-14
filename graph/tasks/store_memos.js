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
    console.log(_ye(`\n${options.c}. `),_bb(`load`),'mapping file');
    
    let lr = new LineByLineReader(options.settings.store_records.path);
    let queue = [],
        eta;

    lr.on('error', next);

    lr.on('line', function (line) {
      // pause emitting of lines...
      // lr.pause();
      
      // split line on tab.
      let lines = line.split('\t')
      // collect lines
      let match_memorial = lines[0].match(/^(\d{4})\/(.*?)$/);
      if(match_memorial)
        queue.push({
          memo_uid: match_memorial[1]+'-'+match_memorial[2],
          year: match_memorial[1]
        });
    });

    lr.on('end', function () {
      // console.log()
      console.log(_gr('    v '), _bb('success, memorialc:'), queue.length, queue[0]);
        //eta.format('{{progress}}/1 eta: {{etah}}, elapsed: {{elapsed}} s')));
      // let eta = new Eta(queue.length);
      let chunks = chunk(queue, 250);
      eta = new Eta(50000);
      console.log(_bb('    expected', _ye(chunks.length), 'chunks of 250 items'));
      async.eachSeries(chunks, (ch, callback) => {
        
        options.neo4j.session.writeTransaction(tx => {
          console.log(_bb('    processing', _ye(ch.length), 'items'));
          ch.forEach(memo => {
            tx.run(options.neo4j.queries.create_memo, memo);
          });
        }).then(function(){
          console.log(_gr('    v '), _bb('success', eta.format('{{progress}}/1 eta: {{etah}}, elapsed: {{elapsed}} s')));
          eta.iterate();
          callback()
        })
        .catch(callback)
      }, next);
    });

    
  } catch(e) {
    // next(e)
    // next()
  }
  },
  // (options, files, next) => {
  //   c++;
  //   console.log(_ye(`\n${c}. `),_bb(`save nodes according to json files.`));
  //   // one memorialc per file.
  //   // options.neo4j.session.writeTransaction(tx => {
  //   //   files.forEach(filepath => {

  //   //     let year = path.dirname(filepath).split('/').pop(),
  //   //     base = path.basename(filepath, settings.glob.ext);
  //   //     console.log(filepath, year, base)
  //   //     return;
  //   //     tx.run(options.neo4j.queries.create_memorialc, params);   
  //   //   })
  //   // })
  //   //   .then(next)
  //   //   .catch(next)

    
  //   // let q = async.queue((filepath, callback) => {
  //   //   let n = {
  //   //     uid: `${year}-${base}`,
  //   //     year: year
  //   //   }
  //   //   console.log(_bb('    '),filepath, _bb('->'), n.uid);
      
  //   //   let q = query.memo.merge;
  //   //   session.run(q, n)
  //   //     .then(res => {
  //   //       let node = res.records[0]._fields[0];
  //   //       console.log(_gr('    v '), _bb('created'), node.properties.uid, _bb('labelled as'), node.labels );
  //   //       callback();
          
  //   //     })
  //   //     .catch(err => {
  //   //       q.kill()
  //   //       next(err)
  //   //     });
      
  //   // })
  //   // q.push(files)
  //   // q.drain = next;
  // }
];