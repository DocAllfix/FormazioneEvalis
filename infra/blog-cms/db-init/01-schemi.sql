-- Uno schema PER SITO, fin dal primo giorno.
--
-- Un database condiviso funzionerebbe benissimo oggi e costringerebbe a una migrazione il
-- giorno in cui si aggiunge il secondo blog — con dentro articoli veri e indicizzati.
-- Separarli adesso costa tre righe.

CREATE DATABASE IF NOT EXISTS wp_evalis
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

GRANT ALL PRIVILEGES ON wp_evalis.* TO 'wpuser'@'%';

-- SECONDO SITO: quando arrivera' bilanciotool si aggiunge qui, con un UTENTE SUO.
-- Non riusare 'wpuser': con un utente solo, un WordPress compromesso legge e riscrive anche
-- il database dell'altro sito. Con due utenti, il danno resta dentro il sito colpito.
--
-- CREATE DATABASE IF NOT EXISTS wp_bilanciotool
--   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
-- CREATE USER IF NOT EXISTS 'wpuser_bilancio'@'%' IDENTIFIED BY '<password propria>';
-- GRANT ALL PRIVILEGES ON wp_bilanciotool.* TO 'wpuser_bilancio'@'%';

FLUSH PRIVILEGES;
