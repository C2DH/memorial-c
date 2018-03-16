/*
  Parse command line args
  Parse data to a neo4j model
  Send bulk data to neo4j
*/
const fs    = require('fs');
const parse = require('csv-parse/lib/sync');
const async  = require('async');
const lodash = require('lodash');
const moment = require('moment');
const glob = require('glob');

// get commandline argus
const commandLineArgs = require('command-line-args');
const options = commandLineArgs([
  { name: 'verbose', alias: 'v', type: Boolean },
  { name: 'src', type: String, multiple: true, defaultOption: true },
  { name: 'glob', alias: 'g',  type: String},
  { name: 'timeout', alias: 't', type: Number},
  { name: 'offset', alias: 'o', type: Number}
])

// load .env file
const config = require('dotenv').config();

const clc = require("cli-color");
const _bb = clc.blackBright;
const _ma = clc.magentaBright;
const _ye = clc.yellowBright;
const _gr = clc.greenBright;


// neo4j
if(!process.env.NEO4J_HOST || !process.env.NEO4J_USER || !process.env.NEO4J_PASS){
  throw 'please put proper process.env.NEO4J_HOST, process.env.NEO4J_USER and process.env.NEO4J_PASS...'
}
console.log(_ye('NEO4J'), _bb('\n- host:'),config.parsed.NEO4J_HOST, _bb('\n- user:'), process.env.NEO4J_USER, '\n\n');

const neo4j    = require('neo4j-driver').v1;
const driver   = neo4j.driver(process.env.NEO4J_HOST, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASS));
const session  = driver.session()
const decypher = require('decypher');
const queries  = decypher('./queries.cyp');

// dicss variables...
const types = require('./types')
types.count = {}
console.log(options)

if(!options.glob){
  throw 'argument: glob STRING required, remember to put in quotes'
}
let files = glob.sync(options.glob);
if (options.offset){
  files = lodash.slice(files, options.offset)
}
console.log(files.length)

const formatDate = (value) => {
  let date = moment(value.trim(), 'D.M.YYYY');

  if(!date.isValid()){
    console.log(`date not valid: "${value}"`);
    return {
      date: 'invalid'
    }
  }

  return {
    t: parseInt(date.format('x')),
    date: date.format('YYYY-MM-DD')
  }
}



const translate = (value, dict) => {
  value = value.trim();
  dict.count[value] = (dict.count[value] || 0 ) + 1;
  if(!dict[value]){
    console.log(value, dict)

    //dict[value] = (dict[value] || 0) + 1;
    throw `unknown value "${value}" in dict`
  }
  return dict[value];
}

// get one array of data and return an document object for Neo4j
const toDocument = (data) => {
  let doc = lodash.zipObject([
    'archive',
    'year',
    'date',
    'type',
    'url',
    'mention',
    'ref',
    'path'
  ], data);

  return {
    ... doc,
    label: translate(doc.type, types),
    uid: doc.archive + '-' + doc.mention,
    year: parseInt(doc.year),
    ... formatDate(doc.date)
  }
};

// get one array of data and return an enterprise "alias" object for Neo4j
const toEnterpriseAlias = (data, i) => {
  let ent = lodash.zipObject([
    'name',
    'type',
    'uid',
    'date',
    'year',
    'address',
    '_',
    '__'
  ], data);

  return {
    ... ent,
    enterprise_uid: ent.uid,
    uid: ent.uid + '-' + i,
    label: translate(ent.type, types),
    year: parseInt(ent.year),
    ... formatDate(ent.date)
  }
}

// get one array of data and return an enterprise object for Neo4j
const toEnterprise = (data) => {
  let ent = lodash.zipObject([
    'uid',
    '_count_aliases',
    '_count_documents'
  ], data);

  return {
    ... ent,

    name: '', // last known alias name
    address: '', // last known address (check aliases)

    _count_aliases: parseInt(ent._count_aliases),
    _count_documents: parseInt(ent._count_documents)
  }
}

// iteratee for file. once done, hit callback.
const iteratee = (item, k, callback) => {
  const contents = fs.readFileSync(item).toString();
  const rows = parse(contents, {delimiter: '\t', quote: false, relax_column_count:true});
  // count tabs. Check file format.
  const is_multititle = rows[0].length < 4;

  console.log(_ye(item), _bb('iteratee'), k, _bb('/',files.length));
  console.log(_bb('- is_multititle:'), is_multititle, _bb('\n- n. rows:'),rows.length)
  console.log(_bb('- first row:', rows[0]))
  // first line: identifier
  let enterprise = is_multititle? toEnterprise(rows[0]): {
    uid: rows[0][2],
    _count_aliases: 1,
    _count_documents: parseInt(rows[0][6])
  };

  // enterprises:
  let aliases = is_multititle? lodash.slice(rows, 1, enterprise._count_aliases + 1).map(toEnterpriseAlias): [toEnterpriseAlias(rows[0], 0)];

  // documents:
  let documents = lodash.slice(rows, is_multititle? enterprise._count_aliases + 1: 1).map(toDocument);
  console.log(rows.length, is_multititle)
  console.log(_bb('uid:'), _ye(enterprise.uid));
  console.log(_bb('-- n.aliases:', _ma(`${aliases.length}`)));

  for(let i=0,l=aliases.length; i < l; i+=1) {
    console.log(_bb('    '),i,_bb('. name:  '), aliases[i].name)
    console.log(_bb('     uid:   '), aliases[i].uid)
    console.log(_bb('     type:  '), aliases[i].type, _bb('/ label:'), aliases[i].label)
    console.log(_bb('     date:  '), aliases[i].date)
  }

  console.log(_bb('-- n.docs:', _ma(`${documents.length}`)));

  if(documents.length){
    console.log(_bb('    '),0,_bb('. uid:  '), documents[0].uid)
    console.log(_bb('     type:  '), documents[0].type)
    console.log(_bb('     label: '), documents[0].label)
    console.log(_bb('     date:  '), documents[0].date)
  }

  if(documents.length > 1) {
    let idx = documents.length-1;
    console.log(_bb('    '),idx,_bb('. uid:  '), documents[idx].uid)
    console.log(_bb('     type:  '), documents[idx].type, _bb('/ label:'), documents[idx].label)
    console.log(_bb('     date:  '), documents[idx].date)
  }

  
  session.writeTransaction(tx => {
    console.log(_bb('    processing items'));

    tx.run(queries.merge_enterprise, enterprise);

    documents.forEach(doc => {
      tx.run(queries.merge_document, {
        ...doc,
        memo_uid: doc.archive,
        enterprise_uid: enterprise.uid
      });
    });

    aliases.forEach(alias => {
      tx.run(queries.merge_alias, alias);
    });

  }).then(function(){
    console.log(_gr('    v '), _bb('success'));
    // eta.iterate();
    callback()
  }).catch(callback)


  //setImmediate(callback);
}

async.eachOfSeries(files, iteratee, (err) => {
  console.log(JSON.stringify(types, null, 2))
  
  if(err)
    throw err
  else{
    session.close()
    driver.close()
  }
  //console.log('done good');
});
