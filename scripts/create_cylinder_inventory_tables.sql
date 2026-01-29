-- Cylinder Location Inventory Management Tables
USE [Cylinder-Management];

-- Create Cylinder Location Inventory Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CYLINDER_LOCATION_INVENTORY' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[CYLINDER_LOCATION_INVENTORY](
        [inventory_id] [bigint] IDENTITY(1,1) NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [location_type] [varchar](20) NOT NULL, -- YARD, VEHICLE, CUSTOMER, PLANT, REFILLING
        [location_reference_id] [int] NULL, -- Optional: specific vehicle/customer ID
        [location_reference_name] [varchar](100) NULL, -- Optional: vehicle/customer name
        [quantity] [int] NOT NULL DEFAULT ((0)),
        [last_updated] [datetime] NOT NULL DEFAULT (getdate()),
        [updated_by] [int] NOT NULL,
        CONSTRAINT [PK_CYLINDER_LOCATION_INVENTORY] PRIMARY KEY CLUSTERED ([inventory_id] ASC),
        CONSTRAINT [FK_INVENTORY_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId]),
        CONSTRAINT [FK_INVENTORY_USER] FOREIGN KEY([updated_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [CHK_INVENTORY_QUANTITY] CHECK ([quantity] >= 0),
        CONSTRAINT [CHK_INVENTORY_LOCATION_TYPE] CHECK ([location_type] IN ('YARD', 'VEHICLE', 'CUSTOMER', 'PLANT', 'REFILLING'))
    );
END
GO

-- Create Cylinder Movement Log Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CYLINDER_MOVEMENT_LOG' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[CYLINDER_MOVEMENT_LOG](
        [movement_id] [bigint] IDENTITY(1,1) NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [from_location_type] [varchar](20) NULL,
        [from_location_reference_id] [int] NULL,
        [to_location_type] [varchar](20) NOT NULL,
        [to_location_reference_id] [int] NULL,
        [quantity] [int] NOT NULL,
        [movement_type] [varchar](20) NULL, -- DELIVERY, RETURN, REFILLING, ADJUSTMENT, etc.
        [reference_transaction_id] [bigint] NULL, -- FK to DELIVERY_TRANSACTION
        [moved_by] [int] NOT NULL,
        [movement_date] [datetime] NOT NULL DEFAULT (getdate()),
        [notes] [varchar](500) NULL,
        CONSTRAINT [PK_CYLINDER_MOVEMENT_LOG] PRIMARY KEY CLUSTERED ([movement_id] ASC),
        CONSTRAINT [FK_MOVEMENT_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId]),
        CONSTRAINT [FK_MOVEMENT_TRANSACTION] FOREIGN KEY([reference_transaction_id]) REFERENCES [dbo].[DELIVERY_TRANSACTION] ([delivery_id]),
        CONSTRAINT [FK_MOVEMENT_USER] FOREIGN KEY([moved_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [CHK_MOVEMENT_QUANTITY] CHECK ([quantity] > 0),
        CONSTRAINT [CHK_MOVEMENT_FROM_LOCATION] CHECK ([from_location_type] IN ('YARD', 'VEHICLE', 'CUSTOMER', 'PLANT', 'REFILLING') OR [from_location_type] IS NULL),
        CONSTRAINT [CHK_MOVEMENT_TO_LOCATION] CHECK ([to_location_type] IN ('YARD', 'VEHICLE', 'CUSTOMER', 'PLANT', 'REFILLING'))
    );
END
GO

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_INVENTORY_CYLINDER_LOCATION')
BEGIN
    CREATE INDEX [IX_INVENTORY_CYLINDER_LOCATION] ON [dbo].[CYLINDER_LOCATION_INVENTORY]
    ([cylinder_type_id], [location_type], [location_reference_id]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_INVENTORY_LOCATION_TYPE')
BEGIN
    CREATE INDEX [IX_INVENTORY_LOCATION_TYPE] ON [dbo].[CYLINDER_LOCATION_INVENTORY]
    ([location_type], [location_reference_id]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MOVEMENT_DATE')
BEGIN
    CREATE INDEX [IX_MOVEMENT_DATE] ON [dbo].[CYLINDER_MOVEMENT_LOG]
    ([movement_date] DESC);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MOVEMENT_TRANSACTION')
BEGIN
    CREATE INDEX [IX_MOVEMENT_TRANSACTION] ON [dbo].[CYLINDER_MOVEMENT_LOG]
    ([reference_transaction_id]);
END
GO

-- Initialize inventory with current cylinders in YARD
-- DISABLED: This script was causing phantom cylinder generation
-- Manual inventory initialization should be done through proper inventory management
-- 
-- IF you need to initialize inventory, use the populate_inventory.sql script instead
-- or manually insert records with actual physical cylinder counts

/*
-- OLD PROBLEMATIC CODE - DO NOT USE
INSERT INTO [dbo].[CYLINDER_LOCATION_INVENTORY] (
    [cylinder_type_id],
    [location_type],
    [quantity],
    [updated_by]
)
SELECT
    ctm.CylinderTypeId,
    'YARD',
    100, -- Default starting quantity - adjust as needed
    1    -- Default admin user ID
FROM [dbo].[CYLINDER_TYPE_MASTER] ctm
WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[CYLINDER_LOCATION_INVENTORY] cli
    WHERE cli.cylinder_type_id = ctm.CylinderTypeId
    AND cli.location_type = 'YARD'
)
*/
GO

PRINT 'Cylinder location inventory tables created successfully!';
GO
