-- Cover identity migration.
--
-- The theming refactor replaces the paired cover shades
--   cover_config.theme       (e.g. "green-500")
--   cover_config.theme_dark  (e.g. "green-800")
-- with a single identity name
--   cover_config.palette     (e.g. "green")
-- that resolves BOTH light and dark renditions on the front end.
--
-- Every supported cover theme's light shade is "<hue>-500", so the identity
-- name is just the hue prefix of the light `theme` value. `split_part(x, '-', 1)`
-- takes the substring before the first '-'. We drop both old keys with the jsonb
-- `-` operator and merge the new key in with `||`.
--
-- Two tables carry a cover: `decks` and `members`. Rows with no `theme` key
-- (null cover_config, or a pattern-only cover) are left untouched — they had no
-- identity and keep falling back on the client default.

update public.decks
set cover_config =
  (cover_config - 'theme' - 'theme_dark')
  || jsonb_build_object('palette', split_part(cover_config ->> 'theme', '-', 1))
where cover_config ? 'theme';

update public.members
set cover_config =
  (cover_config - 'theme' - 'theme_dark')
  || jsonb_build_object('palette', split_part(cover_config ->> 'theme', '-', 1))
where cover_config ? 'theme';
