const fs    = require('fs'),
      clc   = require('cli-color'),
      async = require('async'),
      
      Eta   = require('node-eta'),

      _bb   = clc.blackBright,
      _ma   = clc.magentaBright,
      _ye   = clc.yellowBright,
      _gr   = clc.greenBright,

      slugify = require('slugify'),

      utils = require('./utils');

module.exports = [
  (options, next) => {
    options.c++;
    console.log(_ye(`\n${options.c}. `),_bb(`save`),'entities', _bb(`found in ${options.files.length} json files.`));
    let c = 0,
        eta = new Eta(options.files.length),

        types = {
          'Location': 'location',
          'Person': 'person'
        };

    eta.start()

    async.eachSeries(options.files, (filepath, callback) => {
      c++;
      let f = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      let ca = 0;

      console.log(_bb('    file:',_ye(f.issue, f.month, f.year),'found', _ma(f.articles.length), 'articles, ',_ye(c),'/',options.files.length), f._savedEntities?'[done already]':'');
      if(f._savedEntities) {
        setImmediate(callback);
        return;
      }

      async.eachSeries(f.articles, (art, _callback) => {
        let n = {}
        ca++;
        // most-to-least-significant order [YYYY]-[MM]-[DD]
        n.issue_date    = art.article.issueDate.split('/').reverse().join('-');
        n.issue_year    = n.issue_date.split('-').shift();
        n.article_title = ''+art.article.title;
        n.page_num      = parseInt(art.article.pageNumber) + 1;
        n.newspaper_uid = art.article.publication;

        let issue_edition = 'a';

        // edition?
        n.issue_uid     = `${n.newspaper_uid}-${n.issue_date}-${issue_edition}`;
        n.page_uid      = [n.issue_uid, String(n.page_num).padStart(4, "0")].join('-');
        n.article_uid   = `${n.page_uid}-${art.article.guid}`;
        console.log(_bb('    art:'),n.article_uid, _bb('contains',_ma(art.namedEntities.length),'entities'), ca, _bb('/', f.articles.length))


        let mentions = art.namedEntities.map(d => {
            return {
              type: d.entityType,
              name: d.name,
              surname: d.surname || '',
              firstname: d.firstname || '',
              offset: [parseInt(d.loffset), parseInt(d.roffset)],
              entity_uid: slugify(d.name, {remove: /[$*_+~.()'"!\-:@]/g}).toLowerCase(),
              article_uid: n.article_uid
            }
          }),
          entities = {};

        for(var i=0, j=mentions.length; i < j; i++) {
          if(!entities[mentions[i].entity_uid])
            entities[mentions[i].entity_uid] = {
              splitpoints: [],
              ... mentions[i]
            };
          entities[mentions[i].entity_uid].splitpoints = entities[mentions[i].entity_uid].splitpoints.concat(mentions[i].offset)
        }

        

        Promise.all(Object.keys(entities).map(k => {
          let params = entities[k];
          // console.log(params)
          // console.log(params, 'merge_entity_'+ types[d.entityType], d);
          return options.session.run(queries['merge_entity_'+ types[params.type]], params)
        }))
          .then(values => {
            _callback()
          })
          .catch(_callback)
        
      }, function(err) {
        if(err)
          callback(err)
        else{
          eta.iterate()
          console.log(_bb('   ',eta.format('{{progress}}/1 eta: {{etah}}, elapsed: {{elapsed}} s')));
          // save file!!!!
          f._savedEntities = true;

          // fs.writeFileSync()
          // next file!
          fs.writeFile(filepath, JSON.stringify(f,null,2), callback);

          // callback()
        }
      });
      // eof async.eachSeries(f.articles, (art, _callback) => {
    }, function(err){
      console.log(err);
      next(err, options);
    });
      // eof async.eachSeries(options.files, (filepath, callback) => {
  }
]