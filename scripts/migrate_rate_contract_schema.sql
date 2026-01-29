-- Migration script for rate contract schema changes
-- This script modifies the rate contract system to support specific customers/dealers with multiple cylinder rates

USE cylinder_management;
GO

-- Step 1: Add new columns to RATE_CONTRACT_MASTER table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_MASTER') AND name = 'customer_id')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    ADD customer_id INT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_MASTER') AND name = 'dealer_id')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    ADD dealer_id INT NULL;
END
GO

-- Step 2: Add foreign key constraints (only if they don't exist)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_RATE_CONTRACT_CUSTOMER')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    ADD CONSTRAINT FK_RATE_CONTRACT_CUSTOMER
    FOREIGN KEY (customer_id) REFERENCES dbo.CUSTOMER_MASTER(CustomerId);
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_RATE_CONTRACT_DEALER')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    ADD CONSTRAINT FK_RATE_CONTRACT_DEALER
    FOREIGN KEY (dealer_id) REFERENCES dbo.DEALER_MASTER(DealerId);
END
GO

-- Step 3: Create RATE_CONTRACT_DETAILS table (only if it doesn't exist)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_DETAILS') AND type = 'U')
BEGIN
    CREATE TABLE dbo.RATE_CONTRACT_DETAILS (
        rate_contract_detail_id INT IDENTITY(1,1) PRIMARY KEY,
        rate_contract_id INT NOT NULL,
        cylinder_type_id INT NOT NULL,
        rate_per_cylinder DECIMAL(10,2) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_RATE_CONTRACT_DETAILS_CONTRACT
        FOREIGN KEY (rate_contract_id) REFERENCES dbo.RATE_CONTRACT_MASTER(rate_contract_id)
        ON DELETE CASCADE,
        CONSTRAINT FK_RATE_CONTRACT_DETAILS_CYLINDER
        FOREIGN KEY (cylinder_type_id) REFERENCES dbo.CYLINDER_TYPE_MASTER(CylinderTypeId),
        CONSTRAINT CHK_RATE_CONTRACT_DETAILS_RATE_POSITIVE
        CHECK (rate_per_cylinder > 0)
    );
END
GO

-- Step 4: Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_DETAILS') AND name = 'IX_RATE_CONTRACT_DETAILS_CONTRACT')
BEGIN
    CREATE INDEX IX_RATE_CONTRACT_DETAILS_CONTRACT ON dbo.RATE_CONTRACT_DETAILS(rate_contract_id);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_DETAILS') AND name = 'IX_RATE_CONTRACT_DETAILS_CYLINDER')
BEGIN
    CREATE INDEX IX_RATE_CONTRACT_DETAILS_CYLINDER ON dbo.RATE_CONTRACT_DETAILS(cylinder_type_id);
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_MASTER') AND name = 'IX_RATE_CONTRACT_MASTER_CUSTOMER')
BEGIN
    CREATE INDEX IX_RATE_CONTRACT_MASTER_CUSTOMER ON dbo.RATE_CONTRACT_MASTER(customer_id) WHERE customer_id IS NOT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_MASTER') AND name = 'IX_RATE_CONTRACT_MASTER_DEALER')
BEGIN
    CREATE INDEX IX_RATE_CONTRACT_MASTER_DEALER ON dbo.RATE_CONTRACT_MASTER(dealer_id) WHERE dealer_id IS NOT NULL;
END
GO

-- Step 5: Migrate existing data (only if details table is empty)
IF NOT EXISTS (SELECT TOP 1 1 FROM dbo.RATE_CONTRACT_DETAILS)
BEGIN
    -- Insert details for existing contracts
    INSERT INTO dbo.RATE_CONTRACT_DETAILS (rate_contract_id, cylinder_type_id, rate_per_cylinder)
    SELECT
        rc.rate_contract_id,
        rc.cylinder_type_id,
        rc.rate_per_cylinder
    FROM dbo.RATE_CONTRACT_MASTER rc
    WHERE rc.customer_type IS NOT NULL;
END
GO

-- Step 6: Remove old columns (after verifying data migration)
-- Note: We'll keep the old columns for now to allow rollback if needed
-- Uncomment the following section after verifying the migration is successful

/*
-- Remove old constraints and columns
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_RATE_CONTRACT_MASTER_RATE_POSITIVE')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    DROP CONSTRAINT CHK_RATE_CONTRACT_MASTER_RATE_POSITIVE;
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_RATE_CONTRACT_MASTER_CYLINDER')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    DROP CONSTRAINT FK_RATE_CONTRACT_MASTER_CYLINDER;
END

-- Drop old columns
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_MASTER') AND name = 'customer_type')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    DROP COLUMN customer_type;
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_MASTER') AND name = 'cylinder_type_id')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    DROP COLUMN cylinder_type_id;
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.RATE_CONTRACT_MASTER') AND name = 'rate_per_cylinder')
BEGIN
    ALTER TABLE dbo.RATE_CONTRACT_MASTER
    DROP COLUMN rate_per_cylinder;
END
*/

PRINT 'Rate contract schema migration completed successfully!';
PRINT 'Please verify the data migration and then uncomment the column removal section if satisfied.';
GO
