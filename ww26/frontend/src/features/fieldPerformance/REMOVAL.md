# Removing Field Performance

Delete these to restore WW26 Expo-only:

**Frontend**
- `frontend/src/features/fieldPerformance/` (entire folder)
- In `frontend/src/index.tsx`: remove Field Performance path check and import

**Backend**
- `backend/fieldPerformance/` (entire folder)
- In `backend/server.js`: remove the `app.use('/api/ww26/field', ...)` line

No database migrations or CSV changes were made for this module.
