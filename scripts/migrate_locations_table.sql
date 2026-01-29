-- Migrate LOCATION_MASTER table to new structure
USE [Cylinder-Management];

-- Add new columns for geolocation and image
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LOCATION_MASTER') AND name = 'Image')
BEGIN
    ALTER TABLE [dbo].[LOCATION_MASTER] ADD [Image] [varchar](255) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LOCATION_MASTER') AND name = 'Latitude')
BEGIN
    ALTER TABLE [dbo].[LOCATION_MASTER] ADD [Latitude] [decimal](9, 6) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LOCATION_MASTER') AND name = 'Longitude')
BEGIN
    ALTER TABLE [dbo].[LOCATION_MASTER] ADD [Longitude] [decimal](9, 6) NULL;
END
GO

-- Drop old columns if they exist
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LOCATION_MASTER') AND name = 'City')
BEGIN
    ALTER TABLE [dbo].[LOCATION_MASTER] DROP COLUMN [City];
END
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LOCATION_MASTER') AND name = 'State')
BEGIN
    ALTER TABLE [dbo].[LOCATION_MASTER] DROP COLUMN [State];
END
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LOCATION_MASTER') AND name = 'CustomerId')
BEGIN
    ALTER TABLE [dbo].[LOCATION_MASTER] DROP COLUMN [CustomerId];
END
GO

-- Update Address column to allow longer text for full address
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LOCATION_MASTER') AND name = 'Address')
BEGIN
    ALTER TABLE [dbo].[LOCATION_MASTER] ALTER COLUMN [Address] [varchar](500) NULL;
END
GO

PRINT 'LOCATION_MASTER table migration completed successfully!';
GO
