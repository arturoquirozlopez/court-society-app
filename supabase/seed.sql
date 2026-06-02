-- =====================================================================
-- Court Society — seed data (cities, clubs, opening season)
-- Safe to re-run: uses ON CONFLICT DO NOTHING on natural keys.
-- =====================================================================

-- ---------- Cities ---------------------------------------------------
insert into cities (slug, name) values
  ('santiago',  'Santiago'),
  ('sao-paulo', 'São Paulo'),
  ('miami',     'Miami')
on conflict (slug) do nothing;

-- ---------- Clubs ----------------------------------------------------
with santiago as (select id from cities where slug = 'santiago')
insert into clubs (city_id, slug, name, is_other)
select id, v.slug, v.name, v.is_other from santiago, (values
  ('club-los-leones',                        'Club Los Leones',                          false),
  ('club-polo-equitacion-san-cristobal',     'Club de Polo y Equitación San Cristóbal',  false),
  ('sport-frances',                          'Sport Francés',                            false),
  ('prince-of-wales-country-club',           'Prince of Wales Country Club',             false),
  ('club-de-golf-la-dehesa',                 'Club de Golf La Dehesa',                   false),
  ('other',                                  'Other',                                    true)
) as v(slug, name, is_other)
on conflict (city_id, slug) do nothing;

with sp as (select id from cities where slug = 'sao-paulo')
insert into clubs (city_id, slug, name, is_other)
select id, v.slug, v.name, v.is_other from sp, (values
  ('esporte-clube-pinheiros',     'Esporte Clube Pinheiros',          false),
  ('sociedade-harmonia-de-tenis', 'Sociedade Harmonia de Tênis',      false),
  ('clube-athletico-paulistano',  'Clube Athletico Paulistano',       false),
  ('ipe-clube',                   'Ipê Clube',                        false),
  ('hebraica',                    'Hebraica',                         false),
  ('other',                       'Other',                            true)
) as v(slug, name, is_other)
on conflict (city_id, slug) do nothing;

with mi as (select id from cities where slug = 'miami')
insert into clubs (city_id, slug, name, is_other)
select id, v.slug, v.name, v.is_other from mi, (values
  ('fisher-island-club',          'Fisher Island Club',           false),
  ('indian-creek-country-club',   'Indian Creek Country Club',    false),
  ('ocean-club-key-biscayne',     'Ocean Club Key Biscayne',      false),
  ('la-gorce-country-club',       'La Gorce Country Club',        false),
  ('other',                       'Other',                        true)
) as v(slug, name, is_other)
on conflict (city_id, slug) do nothing;

-- ---------- Opening season -------------------------------------------
insert into seasons (year, active)
  values (extract(year from now())::int, true)
on conflict (year) do nothing;
