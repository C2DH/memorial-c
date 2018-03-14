// name: setup
// only once, set indexes
CREATE CONSTRAINT ON (mem:memo) ASSERT mem.uid  IS UNIQUE
CREATE CONSTRAINT ON (ent:enterprise) ASSERT ent.uid  IS UNIQUE
CREATE CONSTRAINT ON (ali:alias) ASSERT ali.uid  IS UNIQUE
CREATE CONSTRAINT ON (doc:document) ASSERT doc.uid  IS UNIQUE

// name: merge_memo
MERGE (mem:memo {Project:'memorialc', uid:{memo_uid}})
  SET mem.year = {year}
RETURN mem


// name: merge_enterprise
MERGE (ent:enterprise {Project:'memorialc', uid:{uid}})
  SET
    ent._count_aliases = {_count_aliases},
    ent._count_documents = {_count_documents}
RETURN ent


// name: merge_alias
MERGE (ali:alias {Project:'memorialc', uid:{uid}})
  SET
    ali.name = {name},
    ali.type = {type},
    ali.label = {label},
    ali.address = {address}
WITH ali
MATCH (ent:enterprise {Project:'memorialc', uid:{enterprise_uid}})
WITH ent, ali
MERGE (ent)-[:known_as]->(ali)
RETURN ent


// name: set_alias_geocode
CALL apoc.spatial.geocodeOnce({address}) YIELD location
WITH location.latitude as lat, location.longitude as lng


// name: merge_document
MERGE (mem:memo {Project:'memorialc', uid:{memo_uid}})
WITH mem
MERGE (doc:document {Project:'memorialc', uid:{uid}})
  SET
    doc.date = {date},
    doc.time = {t},
    doc.year = {year},
    doc.type = {type},
    doc.label = {label},
    doc.url = {url},
    doc.ref = {ref},
    doc.path = {path}
WITH mem, doc
MERGE (doc)-[:is_part_of]->(mem)
WITH doc
MATCH (ent:enterprise {Project:'memorialc', uid:{enterprise_uid}})
WITH ent, doc
MERGE (doc)-[:ref_to]->(ent)
RETURN doc
