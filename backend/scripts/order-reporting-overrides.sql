-- Order reporting overrides (dashboard Targets MSO vs Non MSO only).
-- orders.order_channel is unchanged (audit: how the order was entered).
--
-- Priority: order_reporting_overrides → orders.reporting_channel → orders.order_channel

-- List all overrides
SELECT
  o.id,
  'METCASH26' || o.id AS order_number,
  o.store_name,
  o.order_channel AS entered_as,
  r.reporting_channel AS report_as,
  r.note,
  r.created_at
FROM order_reporting_overrides r
JOIN orders o ON o.id = r.order_id
ORDER BY o.id;

-- Report one order as Non MSO (e.g. entered MSO but count as retail on Targets)
-- INSERT INTO order_reporting_overrides (order_id, reporting_channel, note)
-- VALUES (142, 'retail', 'NSW - report as Non MSO')
-- ON CONFLICT (order_id) DO UPDATE
--   SET reporting_channel = EXCLUDED.reporting_channel,
--       note = EXCLUDED.note;

-- Report one order as MSO (rare — override retail entry for reporting)
-- INSERT INTO order_reporting_overrides (order_id, reporting_channel, note)
-- VALUES (142, 'mso', 'Count as MSO on Targets')
-- ON CONFLICT (order_id) DO UPDATE
--   SET reporting_channel = EXCLUDED.reporting_channel,
--       note = EXCLUDED.note;

-- Remove override (dashboard reverts to order_channel / reporting_channel on orders)
-- DELETE FROM order_reporting_overrides WHERE order_id = 142;

-- Bulk: all current NSW MSO orders → report as Non MSO (preview first!)
-- SELECT o.id, 'METCASH26' || o.id, o.store_name
-- FROM orders o
-- LEFT JOIN mcash_stores ms ON TRIM(o.store_code) = TRIM(ms.store_id::text)
-- WHERE COALESCE(NULLIF(TRIM(o.store_state), ''), NULLIF(TRIM(ms.state), ''), 'Unknown') = 'NSW'
--   AND LOWER(COALESCE(o.order_channel, 'retail')) = 'mso';

-- INSERT INTO order_reporting_overrides (order_id, reporting_channel, note)
-- SELECT o.id, 'retail', 'NSW MSO → Non MSO for Targets'
-- FROM orders o
-- LEFT JOIN mcash_stores ms ON TRIM(o.store_code) = TRIM(ms.store_id::text)
-- WHERE COALESCE(NULLIF(TRIM(o.store_state), ''), NULLIF(TRIM(ms.state), ''), 'Unknown') = 'NSW'
--   AND LOWER(COALESCE(o.order_channel, 'retail')) = 'mso'
-- ON CONFLICT (order_id) DO UPDATE
--   SET reporting_channel = EXCLUDED.reporting_channel,
--       note = EXCLUDED.note;
