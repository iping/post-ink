-- Backfill studioId for existing rows so all data is connected to a studio.
-- Uses the first studio (by createdAt) as default when studioId is NULL.
-- No-op if no studios exist (subquery returns NULL).

-- Artists: assign to first studio
UPDATE TattooArtist
SET studioId = (SELECT id FROM TattooStudio ORDER BY createdAt ASC LIMIT 1)
WHERE studioId IS NULL;

-- Customers: assign to first studio
UPDATE Customer
SET studioId = (SELECT id FROM TattooStudio ORDER BY createdAt ASC LIMIT 1)
WHERE studioId IS NULL;

-- Specialities: assign to first studio
UPDATE Speciality
SET studioId = (SELECT id FROM TattooStudio ORDER BY createdAt ASC LIMIT 1)
WHERE studioId IS NULL;

-- Bookings: prefer artist's studio, else first studio
UPDATE Booking
SET studioId = (SELECT studioId FROM TattooArtist WHERE TattooArtist.id = Booking.artistId LIMIT 1)
WHERE studioId IS NULL AND artistId IS NOT NULL;

UPDATE Booking
SET studioId = (SELECT id FROM TattooStudio ORDER BY createdAt ASC LIMIT 1)
WHERE studioId IS NULL;

-- Users (non–super_admin): assign to first studio
UPDATE User
SET studioId = (SELECT id FROM TattooStudio ORDER BY createdAt ASC LIMIT 1)
WHERE studioId IS NULL AND (role IS NULL OR role != 'super_admin');

-- Payment destinations (studio-owned): assign to first studio
UPDATE PaymentDestination
SET studioId = (SELECT id FROM TattooStudio ORDER BY createdAt ASC LIMIT 1)
WHERE ownerType = 'studio' AND studioId IS NULL;
