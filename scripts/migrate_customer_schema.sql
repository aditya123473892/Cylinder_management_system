-- Migrate CUSTOMER_MASTER table to use ParentDealerId instead of ParentCustomerId and remove CustomerType
USE [Cylinder-Management];

-- Check if CustomerType column exists and drop it
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CUSTOMER_MASTER') AND name = 'CustomerType')
BEGIN
    ALTER TABLE [dbo].[CUSTOMER_MASTER] DROP COLUMN [CustomerType];
END
GO

-- Check if ParentCustomerId column exists and rename it to ParentDealerId
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CUSTOMER_MASTER') AND name = 'ParentCustomerId')
AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CUSTOMER_MASTER') AND name = 'ParentDealerId')
BEGIN
    EXEC sp_rename 'dbo.CUSTOMER_MASTER.ParentCustomerId', 'ParentDealerId', 'COLUMN';
END
GO

PRINT 'Customer schema migration completed successfully!';
GO
