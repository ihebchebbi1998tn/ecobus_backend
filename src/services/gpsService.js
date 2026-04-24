import { withTransaction } from '../config/db.js';

export const ingest = async (payload) => {
  const {
    busId, tripId, latitude, longitude,
    speed, heading, accuracy, batteryLevel,
  } = payload;

  return withTransaction(async (c) => {
    await c.query(
      `INSERT INTO gps_logs
        (trip_id, bus_id, latitude, longitude, speed, heading, accuracy, battery_level, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW())`,
      [tripId || null, busId, latitude, longitude, speed ?? null,
       heading ?? null, accuracy ?? null, batteryLevel ?? null],
    );

    const { rows } = await c.query(
      `INSERT INTO bus_live_status
        (bus_id, trip_id, latitude, longitude, speed, heading, accuracy,
         battery_level, gps_status, last_update, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ok', NOW(), NOW())
       ON CONFLICT (bus_id) DO UPDATE SET
         trip_id = EXCLUDED.trip_id,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         speed = EXCLUDED.speed,
         heading = EXCLUDED.heading,
         accuracy = EXCLUDED.accuracy,
         battery_level = EXCLUDED.battery_level,
         gps_status = 'ok',
         last_update = NOW(),
         updated_at = NOW()
       RETURNING bus_id, trip_id, latitude, longitude, speed, heading, last_update`,
      [busId, tripId || null, latitude, longitude, speed ?? null,
       heading ?? null, accuracy ?? null, batteryLevel ?? null],
    );

    return rows[0];
  });
};
