CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer', 'craftsman')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  craftsman_id INTEGER REFERENCES users(id),
  work_type TEXT NOT NULL CHECK(work_type IN ('cross', 'cf', 'both')),
  room_name TEXT NOT NULL,
  tatami_count REAL NOT NULL,
  condition TEXT NOT NULL CHECK(condition IN ('good', 'normal', 'bad')),
  grade TEXT NOT NULL CHECK(grade IN ('economy', 'standard', 'premium')),
  has_existing_cf INTEGER DEFAULT 0,
  auto_min INTEGER NOT NULL,
  auto_max INTEGER NOT NULL,
  final_price INTEGER,
  craftsman_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'photo_uploaded', 'reviewing', 'confirmed', 'rejected', 'booked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estimate_id INTEGER NOT NULL REFERENCES estimates(id),
  filename TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
