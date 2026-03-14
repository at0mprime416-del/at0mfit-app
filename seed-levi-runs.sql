-- ============================================
-- LEVI'S RUN HISTORY SEED DATA
-- Replace :user_id with Levi's actual auth.users UUID after he creates an account
-- ============================================

INSERT INTO runs (user_id, date, type, distance_mi, duration_seconds, pace_per_mile_seconds, avg_hr, avg_cadence, elevation_ft, notes) VALUES
  (:user_id, '2026-01-28', 'Indoor aerobic',         2.11, 1723,  816, 131, 158,   0, 'Controlled aerobic; moderate effort.'),
  (:user_id, '2026-01-30', 'Indoor aerobic',         2.28, 1945,  874, 122, 151,   0, 'Controlled aerobic support run.'),
  (:user_id, '2026-02-03', 'Long indoor run',        4.29, 3711,  865, 128, 151,   0, 'Long aerobic session; max HR 141.'),
  (:user_id, '2026-02-06', 'Long indoor run',        4.18, 3746,  895, 133, 150,   0, 'Steady aerobic endurance run.'),
  (:user_id, '2026-02-10', 'Split conditioning',     2.11, 1845,  874, 119, 156,   0, '1.00 mi easy + posterior chain work + 1.11 mi cooldown.'),
  (:user_id, '2026-02-13', 'Indoor aerobic',         2.22, 1945,  874, 122, 151,   0, 'Controlled aerobic support run.'),
  (:user_id, '2026-02-21', 'Indoor aerobic',         3.06, 2476,  808, 134, 163,   0, 'Pace lift with stable HR.'),
  (:user_id, '2026-02-22', 'Outdoor hilly aerobic',  1.67, 1882, 1124, 129, 161, 142, 'Outdoor hills; 6-7 hill sprints. Terrain-adjusted pace.'),
  (:user_id, '2026-02-25', 'Long indoor run',        5.04, 4495,  891, 133, 161,   0, 'Longest logged run. Mild left upper glute soreness after.'),
  (:user_id, '2026-03-04', 'Outdoor hilly aerobic',  3.68, 2843,  771, 135, NULL, 457, 'Fastest hill run logged. No hip pain. +221% elevation vs Feb 22.');
