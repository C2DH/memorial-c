// name: setup
// only once, set indexes
CREATE CONSTRAINT ON (mem:memo) ASSERT mem.uid  IS UNIQUE
CREATE CONSTRAINT ON (rec:record) ASSERT rec.uid  IS UNIQUE

// name: create_record
//
MERGE (rec:record {Project:'memorialc', uid:{record_uid}})
ON CREATE
  set rec.type = {type}
WITH rec
MATCH (mem:memo {Project:'memorialc', uid:{memo_uid}})
MERGE (rec)-[r:published_in]->(mem)
RETURN r


// name: create_mention
// registered mention of an enterprise in a record
MERGE (men:mention {Project:'memorialc', uid:{mention_uid}})
WITH men
MATCH (rec:record {Project:'memorialc', uid:{record_uid}})
MERGE (men)-[r:mentioned_in]->(rec)
return r

// name: merge_relationship_record_memo
//
MATCH (rec:record {Project:'memorialc', uid:{record_uid}}), (mem:memo {Project:'memorialc', uid:{memo_uid}})
MERGE (rec)-[r:published_in]->(mem)
RETURN r


