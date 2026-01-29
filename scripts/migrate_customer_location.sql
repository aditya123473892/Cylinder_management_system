-- Migrate Customer Master table from LocationId to Location
-- This script converts the LocationId foreign key to a direct Location string field

USE CylinderManagement;
GO

-- Check if LocationId column exists and migrate if needed
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'CUSTOMER_MASTER'
    AND COLUMN_NAME = 'LocationId'
)
BEGIN
    PRINT 'LocationId column found. Starting migration...';

    -- Add the new Location column
    PRINT 'Adding Location column...';
    ALTER TABLE CUSTOMER_MASTER
    ADD Location NVARCHAR(200) NULL;

    -- Copy location names from LOCATION_MASTER table (if it exists)
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'LOCATION_MASTER')
    BEGIN
        PRINT 'Copying location data from LOCATION_MASTER...';
        UPDATE cm SET cm.Location = lm.LocationName
        FROM CUSTOMER_MASTER cm
        LEFT JOIN LOCATION_MASTER lm ON cm.LocationId = lm.LocationId;
    END
    ELSE
    BEGIN
        PRINT 'LOCATION_MASTER table not found. Setting default location...';
        UPDATE CUSTOMER_MASTER SET Location = 'Unknown' WHERE Location IS NULL;
    END

    -- Make Location NOT NULL after data migration
    PRINT 'Setting Location as NOT NULL...';
    UPDATE CUSTOMER_MASTER SET Location = 'Unknown' WHERE Location IS NULL;
    ALTER TABLE CUSTOMER_MASTER ALTER COLUMN Location NVARCHAR(200) NOT NULL;

    -- Drop the old LocationId column
    PRINT 'Dropping LocationId column...';
    ALTER TABLE CUSTOMER_MASTER DROP COLUMN LocationId;

    PRINT 'Migration completed successfully!';
END
ELSE IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'CUSTOMER_MASTER'
    AND COLUMN_NAME = 'Location'
)
BEGIN
    PRINT 'Location column not found. Adding it...';
    ALTER TABLE CUSTOMER_MASTER
    ADD Location NVARCHAR(200) NOT NULL DEFAULT 'Unknown';

    PRINT 'Location column added successfully!';
END
ELSE
BEGIN
    PRINT 'Location column already exists. No migration needed.';
END

GO
