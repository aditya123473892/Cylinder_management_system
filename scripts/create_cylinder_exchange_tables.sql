-- Create Cylinder Exchange Tracking Tables for Daily Order-Based Dispatch System
USE [Cylinder-Management];

-- 1. Enhanced Delivery Plan with Exchange Tracking
IF NOT EXISTS (SELECT * FROM syscolumns WHERE id = OBJECT_ID('DELIVERY_PLAN') AND name = 'dispatch_date')
BEGIN
    ALTER TABLE [dbo].[DELIVERY_PLAN] ADD
        [dispatch_date] [date] NOT NULL DEFAULT (CAST(GETDATE() AS DATE)),
        [exchange_type] [varchar](20) NOT NULL DEFAULT ('ORDER_BASED'),
        [total_expected_empties] [int] NOT NULL DEFAULT (0),
        [total_collected_empties] [int] NOT NULL DEFAULT (0),
        [total_shortages] [int] NOT NULL DEFAULT (0),
        [total_excess] [int] NOT NULL DEFAULT (0);
END
GO

-- 2. Cylinder Exchange Tracking Table (Per Order Exchange)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ORDER_EXCHANGE_TRACKING' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[ORDER_EXCHANGE_TRACKING](
        [exchange_id] [bigint] IDENTITY(1,1) NOT NULL,
        [order_id] [bigint] NOT NULL,
        [delivery_transaction_id] [bigint] NULL,
        [filled_delivered] [int] NOT NULL DEFAULT (0),
        [empty_collected] [int] NOT NULL DEFAULT (0),
        [expected_empty] [int] NOT NULL DEFAULT (0),
        [variance_qty] [int] NOT NULL DEFAULT (0), -- empty_collected - expected_empty
        [variance_type] [varchar](20) NOT NULL DEFAULT ('MATCH'), -- SHORTAGE, EXCESS, MATCH
        [variance_reason] [varchar](100) NULL, -- STOCK_SHORTAGE, CUSTOMER_REJECTED, DAMAGE, WRONG_TYPE, etc.
        [customer_acknowledged] [bit] NOT NULL DEFAULT (0),
        [acknowledged_by] [int] NULL,
        [acknowledged_at] [datetime] NULL,
        [notes] [varchar](500) NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        [updated_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_ORDER_EXCHANGE_TRACKING] PRIMARY KEY CLUSTERED ([exchange_id] ASC),
        CONSTRAINT [FK_ORDER_EXCHANGE_TRACKING_ORDER] FOREIGN KEY([order_id]) REFERENCES [dbo].[DELIVERY_ORDER] ([order_id]),
        CONSTRAINT [FK_ORDER_EXCHANGE_TRACKING_DELIVERY_TRANSACTION] FOREIGN KEY([delivery_transaction_id]) REFERENCES [dbo].[DELIVERY_TRANSACTION] ([delivery_id]),
        CONSTRAINT [FK_ORDER_EXCHANGE_TRACKING_ACKNOWLEDGED_BY] FOREIGN KEY([acknowledged_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [CHK_ORDER_EXCHANGE_TRACKING_VARIANCE_TYPE] CHECK ([variance_type] IN ('SHORTAGE', 'EXCESS', 'MATCH')),
        CONSTRAINT [CHK_ORDER_EXCHANGE_TRACKING_QUANTITIES] CHECK ([filled_delivered] >= 0 AND [empty_collected] >= 0 AND [expected_empty] >= 0)
    );
END
GO

-- 3. Daily Reconciliation Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DAILY_RECONCILIATION' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DAILY_RECONCILIATION](
        [reconciliation_id] [bigint] IDENTITY(1,1) NOT NULL,
        [plan_id] [bigint] NOT NULL,
        [reconciliation_date] [date] NOT NULL,
        [reconciliation_time] [time] NOT NULL,
        [total_orders] [int] NOT NULL DEFAULT (0),
        [total_exchanges] [int] NOT NULL DEFAULT (0),
        [total_shortages] [int] NOT NULL DEFAULT (0),
        [total_excess] [int] NOT NULL DEFAULT (0),
        [total_damage] [int] NOT NULL DEFAULT (0),
        [shortage_value] [decimal](12,2) NOT NULL DEFAULT (0),
        [excess_value] [decimal](12,2) NOT NULL DEFAULT (0),
        [damage_value] [decimal](12,2) NOT NULL DEFAULT (0),
        [net_variance_value] [decimal](12,2) NOT NULL DEFAULT (0), -- shortage_value - excess_value + damage_value
        [reconciled_by] [int] NOT NULL,
        [approved_by] [int] NULL,
        [approved_at] [datetime] NULL,
        [status] [varchar](20) NOT NULL DEFAULT ('PENDING'), -- PENDING, IN_PROGRESS, COMPLETED, APPROVED
        [reconciliation_notes] [varchar](1000) NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        [updated_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_DAILY_RECONCILIATION] PRIMARY KEY CLUSTERED ([reconciliation_id] ASC),
        CONSTRAINT [FK_DAILY_RECONCILIATION_PLAN] FOREIGN KEY([plan_id]) REFERENCES [dbo].[DELIVERY_PLAN] ([plan_id]),
        CONSTRAINT [FK_DAILY_RECONCILIATION_RECONCILED_BY] FOREIGN KEY([reconciled_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [FK_DAILY_RECONCILIATION_APPROVED_BY] FOREIGN KEY([approved_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [CHK_DAILY_RECONCILIATION_STATUS] CHECK ([status] IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED')),
        CONSTRAINT [CHK_DAILY_RECONCILIATION_VALUES] CHECK ([shortage_value] >= 0 AND [excess_value] >= 0 AND [damage_value] >= 0),
        CONSTRAINT [UQ_DAILY_RECONCILIATION_PLAN] UNIQUE ([plan_id])
    );
END
GO

-- 4. Exchange Variance Details Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EXCHANGE_VARIANCE_DETAIL' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[EXCHANGE_VARIANCE_DETAIL](
        [variance_detail_id] [bigint] IDENTITY(1,1) NOT NULL,
        [reconciliation_id] [bigint] NOT NULL,
        [customer_id] [int] NOT NULL,
        [customer_name] [varchar](100) NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [cylinder_description] [varchar](100) NOT NULL,
        [variance_type] [varchar](20) NOT NULL, -- SHORTAGE, EXCESS, DAMAGE
        [variance_quantity] [int] NOT NULL,
        [unit_value] [decimal](10,2) NOT NULL,
        [total_value] [decimal](12,2) NOT NULL,
        [variance_reason] [varchar](100) NULL,
        [resolution_status] [varchar](20) NOT NULL DEFAULT ('PENDING'), -- PENDING, RESOLVED, ESCALATED
        [resolution_notes] [varchar](500) NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_EXCHANGE_VARIANCE_DETAIL] PRIMARY KEY CLUSTERED ([variance_detail_id] ASC),
        CONSTRAINT [FK_EXCHANGE_VARIANCE_DETAIL_RECONCILIATION] FOREIGN KEY([reconciliation_id]) REFERENCES [dbo].[DAILY_RECONCILIATION] ([reconciliation_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_EXCHANGE_VARIANCE_DETAIL_CUSTOMER] FOREIGN KEY([customer_id]) REFERENCES [dbo].[CUSTOMER_MASTER] ([CustomerId]),
        CONSTRAINT [FK_EXCHANGE_VARIANCE_DETAIL_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId]),
        CONSTRAINT [CHK_EXCHANGE_VARIANCE_DETAIL_TYPE] CHECK ([variance_type] IN ('SHORTAGE', 'EXCESS', 'DAMAGE')),
        CONSTRAINT [CHK_EXCHANGE_VARIANCE_DETAIL_QUANTITY] CHECK ([variance_quantity] != 0),
        CONSTRAINT [CHK_EXCHANGE_VARIANCE_DETAIL_VALUE] CHECK ([total_value] >= 0),
        CONSTRAINT [CHK_EXCHANGE_VARIANCE_DETAIL_RESOLUTION] CHECK ([resolution_status] IN ('PENDING', 'RESOLVED', 'ESCALATED'))
    );
END
GO

-- 5. Vehicle End-of-Day Inventory Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VEHICLE_END_OF_DAY_INVENTORY' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[VEHICLE_END_OF_DAY_INVENTORY](
        [inventory_id] [bigint] IDENTITY(1,1) NOT NULL,
        [plan_id] [bigint] NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [cylinder_description] [varchar](100) NOT NULL,
        [expected_remaining] [int] NOT NULL DEFAULT (0), -- Expected based on deliveries
        [actual_remaining] [int] NOT NULL DEFAULT (0), -- Actual count at end of day
        [variance] [int] NOT NULL DEFAULT (0), -- actual_remaining - expected_remaining
        [variance_reason] [varchar](100) NULL,
        [counted_by] [int] NOT NULL,
        [counted_at] [datetime] NOT NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_VEHICLE_END_OF_DAY_INVENTORY] PRIMARY KEY CLUSTERED ([inventory_id] ASC),
        CONSTRAINT [FK_VEHICLE_END_OF_DAY_INVENTORY_PLAN] FOREIGN KEY([plan_id]) REFERENCES [dbo].[DELIVERY_PLAN] ([plan_id]),
        CONSTRAINT [FK_VEHICLE_END_OF_DAY_INVENTORY_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId]),
        CONSTRAINT [FK_VEHICLE_END_OF_DAY_INVENTORY_COUNTED_BY] FOREIGN KEY([counted_by]) REFERENCES [dbo].[USER_MASTER] ([UserId])
    );
END
GO

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ORDER_EXCHANGE_TRACKING_ORDER')
BEGIN
    CREATE INDEX [IX_ORDER_EXCHANGE_TRACKING_ORDER] ON [dbo].[ORDER_EXCHANGE_TRACKING]
    ([order_id], [created_at] DESC);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ORDER_EXCHANGE_TRACKING_PLAN')
BEGIN
    CREATE INDEX [IX_ORDER_EXCHANGE_TRACKING_PLAN] ON [dbo].[ORDER_EXCHANGE_TRACKING]
    ([delivery_transaction_id], [variance_type]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DAILY_RECONCILIATION_PLAN')
BEGIN
    CREATE INDEX [IX_DAILY_RECONCILIATION_PLAN] ON [dbo].[DAILY_RECONCILIATION]
    ([plan_id], [reconciliation_date] DESC);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EXCHANGE_VARIANCE_RECONCILIATION')
BEGIN
    CREATE INDEX [IX_EXCHANGE_VARIANCE_RECONCILIATION] ON [dbo].[EXCHANGE_VARIANCE_DETAIL]
    ([reconciliation_id], [variance_type]);
END
GO

-- Add trigger to update delivery plan totals
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_UPDATE_DELIVERY_PLAN_EXCHANGE_TOTALS')
BEGIN
    EXEC('
    CREATE TRIGGER [dbo].[TRG_UPDATE_DELIVERY_PLAN_EXCHANGE_TOTALS]
    ON [dbo].[ORDER_EXCHANGE_TRACKING]
    AFTER INSERT, UPDATE, DELETE
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- Update delivery plan totals based on exchange tracking
        UPDATE dp
        SET 
            dp.total_expected_empties = ISNULL((
                SELECT SUM(oet.expected_empty) 
                FROM ORDER_EXCHANGE_TRACKING oet
                INNER JOIN DELIVERY_PLAN_ORDER dpo ON oet.order_id = dpo.order_id
                WHERE dpo.plan_id = dp.plan_id
            ), 0),
            dp.total_collected_empties = ISNULL((
                SELECT SUM(oet.empty_collected) 
                FROM ORDER_EXCHANGE_TRACKING oet
                INNER JOIN DELIVERY_PLAN_ORDER dpo ON oet.order_id = dpo.order_id
                WHERE dpo.plan_id = dp.plan_id
            ), 0),
            dp.total_shortages = ISNULL((
                SELECT SUM(CASE WHEN oet.variance_qty < 0 THEN ABS(oet.variance_qty) ELSE 0 END)
                FROM ORDER_EXCHANGE_TRACKING oet
                INNER JOIN DELIVERY_PLAN_ORDER dpo ON oet.order_id = dpo.order_id
                WHERE dpo.plan_id = dp.plan_id
            ), 0),
            dp.total_excess = ISNULL((
                SELECT SUM(CASE WHEN oet.variance_qty > 0 THEN oet.variance_qty ELSE 0 END)
                FROM ORDER_EXCHANGE_TRACKING oet
                INNER JOIN DELIVERY_PLAN_ORDER dpo ON oet.order_id = dpo.order_id
                WHERE dpo.plan_id = dp.plan_id
            ), 0)
        FROM DELIVERY_PLAN dp
        INNER JOIN DELIVERY_PLAN_ORDER dpo ON dp.plan_id = dpo.plan_id
        INNER JOIN (SELECT DISTINCT order_id FROM INSERTED UNION SELECT DISTINCT order_id FROM DELETED) changed ON dpo.order_id = changed.order_id;
    END
    ');
END
GO

-- Add trigger to update daily reconciliation values (simplified version without cylinder_type_id)
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_UPDATE_DAILY_RECONCILIATION_VALUES')
BEGIN
    EXEC('
    CREATE TRIGGER [dbo].[TRG_UPDATE_DAILY_RECONCILIATION_VALUES]
    ON [dbo].[ORDER_EXCHANGE_TRACKING]
    AFTER INSERT, UPDATE, DELETE
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- Update daily reconciliation values (without financial calculations that require cylinder_type_id)
        UPDATE dr
        SET 
            dr.total_orders = ISNULL((
                SELECT COUNT(DISTINCT oet.order_id)
                FROM ORDER_EXCHANGE_TRACKING oet
                INNER JOIN DELIVERY_PLAN_ORDER dpo ON oet.order_id = dpo.order_id
                WHERE dpo.plan_id = dr.plan_id
            ), 0),
            dr.total_exchanges = ISNULL((
                SELECT COUNT(*)
                FROM ORDER_EXCHANGE_TRACKING oet
                INNER JOIN DELIVERY_PLAN_ORDER dpo ON oet.order_id = dpo.order_id
                WHERE dpo.plan_id = dr.plan_id AND oet.filled_delivered > 0
            ), 0),
            dr.total_shortages = ISNULL((
                SELECT SUM(CASE WHEN oet.variance_qty < 0 THEN ABS(oet.variance_qty) ELSE 0 END)
                FROM ORDER_EXCHANGE_TRACKING oet
                INNER JOIN DELIVERY_PLAN_ORDER dpo ON oet.order_id = dpo.order_id
                WHERE dpo.plan_id = dr.plan_id
            ), 0),
            dr.total_excess = ISNULL((
                SELECT SUM(CASE WHEN oet.variance_qty > 0 THEN oet.variance_qty ELSE 0 END)
                FROM ORDER_EXCHANGE_TRACKING oet
                INNER JOIN DELIVERY_PLAN_ORDER dpo ON oet.order_id = dpo.order_id
                WHERE dpo.plan_id = dr.plan_id
            ), 0)
        FROM DAILY_RECONCILIATION dr
        INNER JOIN DELIVERY_PLAN_ORDER dpo ON dr.plan_id = dpo.plan_id
        INNER JOIN (SELECT DISTINCT order_id FROM INSERTED UNION SELECT DISTINCT order_id FROM DELETED) changed ON dpo.order_id = changed.order_id;
    END
    ');
END
GO

PRINT 'Cylinder Exchange Tracking tables created successfully!';
GO