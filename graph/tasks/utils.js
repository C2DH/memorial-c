const _get  = require('lodash.get');

const recypher = function(cyq, vars) {
  // parse cypher query and add template features
  let _cyq = cyq
    
    .replace(/\{% for (.*?)\s+in\s?(.*?)\s+%\}([\s\S]+?)\{% endfor %\}/mg, function (m, item, collection, contents) {
      // replace a pseudo template loop 
      //    {:for language in languages} 
      //      title_{:language} = {title_{:language}} 
      //    {:endfor}
      // with 
      //      title_en = {title_en}, 
      //      title_fr = {title_fr}
      // which should be cypher compatible.
      // This function call recursively the same function() 
      console.log(item, collection);

      var template = [];
      for(var i in vars[collection]) {
        var f = {};
        f = vars[collection][i];
        // console.log(f)
        template.push(recypher(contents, f));
      }
      return template.join(' ');
    })
    .replace(/\{\{([a-z_\.A-Z]+)\}\}/g, function (m, placeholder) {
      // replace dynamic variables (used for label)
      // e.g. `MATCH (ent:{:type})` becomes `MATCH (ent:person)` if type = 'person'
      console.log(m, placeholder, vars)
      let v = _get(vars, placeholder) || vars[placeholder.split('.').pop()]
      if(!v){
        throw 'Error! Bad parsing or var not found.'
      }
      return v
    })
  return _cyq
}

const groupBy = function(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

module.exports = { recypher, groupBy }