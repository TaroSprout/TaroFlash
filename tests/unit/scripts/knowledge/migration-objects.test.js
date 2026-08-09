import { describe, test, expect } from 'vite-plus/test'
import { migrationObjects } from '../../../../scripts/knowledge/migration-objects.mjs'

describe('migrationObjects — parsing', () => {
  test('a plain create table is picked up', () => {
    expect(migrationObjects('create table decks (id bigint);')).toEqual(['decks'])
  })

  test('multiple statement kinds are all collected, deduplicated and sorted', () => {
    const sql = `
      create table decks (id bigint);
      alter table cards add column rank int;
      create view due_cards as select * from cards;
      create or replace function purge_downgraded_decks() returns void as $$ begin end; $$ language plpgsql;
      create type deck_visibility as enum ('public', 'private');
      create index on decks (member_id);
      create policy "own decks" on decks for select using (true);
      create trigger set_member_id before insert on cards for each row execute function set_member_id();
    `

    expect(migrationObjects(sql)).toEqual([
      'cards',
      'deck_visibility',
      'decks',
      'due_cards',
      'purge_downgraded_decks'
    ])
  })
})

describe('migrationObjects — comments and function bodies are ignored', () => {
  test('a line comment naming a table is not a schema change', () => {
    const sql = '-- this migration touches the decks table for good measure\nselect 1;'

    expect(migrationObjects(sql)).toEqual([])
  })

  test('a block comment naming a table is not a schema change', () => {
    const sql = '/* create table decks (id bigint); */\nselect 1;'

    expect(migrationObjects(sql)).toEqual([])
  })

  test('a dollar-quoted function body referencing a table is not a schema change', () => {
    const sql = `
      create function touch_media() returns trigger as $function$
      begin
        update public.media set updated_at = now();
        return new;
      end;
      $function$ language plpgsql;
    `

    expect(migrationObjects(sql)).toEqual(['touch_media'])
  })
})

describe('migrationObjects — name normalisation', () => {
  test('a fully quoted, schema-qualified name normalises to the same bare name as a plain one', () => {
    const quoted = migrationObjects('create table "public"."decks" (id bigint);')
    const bare = migrationObjects('create table decks (id bigint);')

    expect(quoted).toEqual(bare)
    expect(quoted).toEqual(['decks'])
  })
})
