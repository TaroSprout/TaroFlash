#!/usr/bin/env python3
"""Split a marker-annotated pg_dump into ordered declarative schema files."""
import re
import sys
from collections import defaultdict
from pathlib import Path

DUMP = Path(sys.argv[1])
OUT = Path(sys.argv[2])

HEADER = """\
-- Generated from pg_dump via scripts/dump-schemas; edit freely — this file is
-- the canonical definition. Run `supabase db diff -f <name>` after editing to
-- produce the migration.
SET check_function_bodies = false;

"""

MARKER = re.compile(r"^-- Name: (?P<name>.*); Type: (?P<type>.*); Schema: (?P<schema>.*); Owner: (?P<owner>.*)$")
FUNC_NAME = re.compile(r"^(?P<fn>[^(]+)\(")

sections = []  # (name, type, schema, lines)
current = None
for line in DUMP.read_text().splitlines(keepends=True):
    m = MARKER.match(line)
    if m:
        current = (m["name"], m["type"], m["schema"], [])
        sections.append(current)
        continue
    if line.startswith(("SET default_tablespace", "SET default_table_access_method")):
        continue
    if current is not None and not line.startswith("--"):
        current[3].append(line)

buckets = defaultdict(list)
func_files = defaultdict(list)  # public function name -> chunks (def + acl)


def body(sec):
    text = "".join(sec[3]).strip("\n")
    return text + "\n" if text else ""


unknown = set()
for sec in sections:
    name, typ, schema, _ = sec
    chunk = body(sec)
    if not chunk:
        continue
    if typ == "SCHEMA" and name == "public":
        continue  # shadow db already has it; keep only the COMMENT section
    if schema == "tests" or name == "tests" or name == "SCHEMA tests":
        continue  # pgTAP helpers live in supabase/tests, not in migrations
    if typ == "FUNCTION" and schema == "public":
        fn = FUNC_NAME.match(name)["fn"]
        func_files[fn].append(chunk)
    elif typ == "ACL" and name.startswith("FUNCTION ") and schema == "public":
        fn = FUNC_NAME.match(name.removeprefix("FUNCTION "))["fn"]
        func_files[fn].append(chunk)
    elif typ == "COMMENT":
        buckets["10_comments"].append(chunk)
    elif typ in ("SCHEMA", "EXTENSION"):
        buckets["01_init"].append(chunk)
    elif typ == "TYPE":
        buckets["02_types"].append(chunk)
    elif typ in ("TABLE", "SEQUENCE", "SEQUENCE OWNED BY", "DEFAULT", "CONSTRAINT", "FK CONSTRAINT", "INDEX"):
        buckets["03_tables"].append(chunk)
    elif typ == "VIEW":
        buckets["04_views"].append(chunk)
    elif typ == "TRIGGER":
        buckets["07_triggers"].append(chunk)
    elif typ in ("POLICY", "ROW SECURITY"):
        buckets["08_policies"].append(chunk)
    elif typ == "DEFAULT ACL":
        continue  # platform boilerplate; db diff cannot manage default privileges
    elif typ == "ACL":
        buckets["09_grants"].append(chunk)
    else:
        unknown.add(typ)

if unknown:
    sys.exit(f"unbucketed section types: {unknown}")

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "functions").mkdir(exist_ok=True)

for stem, chunks in sorted(buckets.items()):
    (OUT / f"{stem}.sql").write_text(HEADER + "\n\n".join(chunks) + "\n")
for fn, chunks in sorted(func_files.items()):
    (OUT / "functions" / f"{fn}.sql").write_text(HEADER + "\n\n".join(chunks) + "\n")

print(f"{len(buckets)} bucket files, {len(func_files)} function files")
