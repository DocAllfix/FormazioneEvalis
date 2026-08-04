-- Uno schema PER SITO, fin dal primo giorno.
--
-- Un database condiviso funzionerebbe benissimo oggi e costringerebbe a una migrazione il
-- giorno in cui si aggiunge il secondo blog — con dentro articoli veri e indicizzati.
-- Separarli adesso costa tre righe.

CREATE DATABASE IF NOT EXISTS wp_evalis
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

-- SECONDO SITO: quando arrivera' bilanciotool, si aggiunge qui
-- CREATE DATABASE IF NOT EXISTS wp_bilanciotool
--   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
-- GRANT ALL PRIVILEGES ON wp_bilanciotool.* TO 'wpuser'@'%';

GRANT ALL PRIVILEGES ON wp_evalis.* TO 'wpuser'@'%';
FLUSH PRIVILEGES;
