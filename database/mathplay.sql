CREATE DATABASE IF NOT EXISTS mathplay
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mathplay;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  display_name VARCHAR(40) NULL,
  profile_picture MEDIUMTEXT NULL,
  profile_banner MEDIUMTEXT NULL,
  email VARCHAR(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'Aluno',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  game VARCHAR(40) NOT NULL,
  difficulty ENUM('facil', 'medio', 'dificil') NOT NULL DEFAULT 'medio',
  score TINYINT UNSIGNED NOT NULL,
  correct_answers INT UNSIGNED NOT NULL,
  total_questions INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_game_results_user_created (user_id, created_at),
  KEY idx_game_results_user_game (user_id, game),
  CONSTRAINT fk_game_results_user
    FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS achievements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  badge VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  description VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_achievements_user_badge (user_id, badge),
  CONSTRAINT fk_achievements_user
    FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
