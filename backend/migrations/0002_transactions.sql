CREATE TABLE transactions (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT,
  notes TEXT,
  recurrence TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id),
  CHECK (type IN ('income', 'expense')),
  CHECK (amount > 0),
  CHECK (length(category) BETWEEN 1 AND 80),
  CHECK (length(description) BETWEEN 1 AND 160),
  CHECK (date GLOB '????-??-??'),
  CHECK (recurrence IS NULL OR recurrence IN ('weekly', 'monthly', 'yearly')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);