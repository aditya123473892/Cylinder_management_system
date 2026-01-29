-- Add GST, State Code, and related columns to Customer Master table
USE [Cylinder-Management];

-- Check if columns already exist before adding them
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CUSTOMER_MASTER' AND COLUMN_NAME = 'GSTNumber')
BEGIN
    PRINT 'Adding GSTNumber column...';
    ALTER TABLE [dbo].[CUSTOMER_MASTER] ADD [GSTNumber] [varchar](15) NULL;
END
ELSE
BEGIN
    PRINT 'GSTNumber column already exists';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CUSTOMER_MASTER' AND COLUMN_NAME = 'StateCode')
BEGIN
    PRINT 'Adding StateCode column...';
    ALTER TABLE [dbo].[CUSTOMER_MASTER] ADD [StateCode] [varchar](2) NULL;
END
ELSE
BEGIN
    PRINT 'StateCode column already exists';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CUSTOMER_MASTER' AND COLUMN_NAME = 'BillingAddress')
BEGIN
    PRINT 'Adding BillingAddress column...';
    ALTER TABLE [dbo].[CUSTOMER_MASTER] ADD [BillingAddress] [varchar](500) NULL;
END
ELSE
BEGIN
    PRINT 'BillingAddress column already exists';
END

-- Add constraints for GST format (optional - basic validation)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('[dbo].[CUSTOMER_MASTER]') AND name = 'CK_CUSTOMER_GST_FORMAT')
BEGIN
    PRINT 'Adding GST format check constraint...';
    ALTER TABLE [dbo].[CUSTOMER_MASTER] WITH NOCHECK ADD CONSTRAINT [CK_CUSTOMER_GST_FORMAT] 
        CHECK ([GSTNumber] IS NULL OR ([GSTNumber] LIKE '[0-9][0-9][A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][A-Z][0-9][A-Z][0-9][A-Z][0-9]'));
END
ELSE
BEGIN
    PRINT 'GST format constraint already exists';
END

-- Add constraint for State Code (should be 2 characters)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('[dbo].[CUSTOMER_MASTER]') AND name = 'CK_CUSTOMER_STATE_CODE')
BEGIN
    PRINT 'Adding State Code check constraint...';
    ALTER TABLE [dbo].[CUSTOMER_MASTER] WITH NOCHECK ADD CONSTRAINT [CK_CUSTOMER_STATE_CODE] 
        CHECK ([StateCode] IS NULL OR (LEN([StateCode]) = 2 AND [StateCode] LIKE '[A-Z][A-Z]'));
END
ELSE
BEGIN
    PRINT 'State Code constraint already exists';
END

PRINT 'Customer Master table updated successfully with GST, State Code, and Billing Address columns!';
GO
