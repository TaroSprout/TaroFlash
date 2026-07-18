-- The boolean `flip_cards` key in decks.study_config becomes the three-way
-- `starting_side` ('front' | 'back' | 'random'). Data-only migration: the bag is
-- untyped jsonb, so there's no DDL for the declarative schema to diff.
update public.decks
set study_config =
  (study_config - 'flip_cards')
  || jsonb_build_object(
    'starting_side',
    case when (study_config ->> 'flip_cards')::boolean then 'back' else 'front' end
  )
where study_config ? 'flip_cards';
