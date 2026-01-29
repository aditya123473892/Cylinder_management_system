-- Create Delivery Orders Tables for Complete Delivery Process Flow
USE [Cylinder-Management];

-- 1. Delivery Order Header Table (Advance Order Booking)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELIVERY_ORDER' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DELIVERY_ORDER](
        [order_id] [bigint] IDENTITY(1,1) NOT NULL,
        [order_number] [varchar](50) NOT NULL,
        [customer_id] [int] NOT NULL,
        [customer_name] [varchar](100) NOT NULL,
        [customer_type] [varchar](20) NOT NULL,
        [location_id] [int] NOT NULL,
        [location_name] [varchar](100) NOT NULL,
        [rate_contract_id] [int] NOT NULL,
        [order_date] [date] NOT NULL,
        [requested_delivery_date] [date] NOT NULL,
        [requested_delivery_time] [time] NULL,
        [priority] [varchar](20) NOT NULL DEFAULT ('NORMAL'), -- URGENT, HIGH, NORMAL, LOW
        [order_status] [varchar](30) NOT NULL DEFAULT ('PENDING'), -- PENDING, CONFIRMED, ASSIGNED, LOADED, IN_TRANSIT, DELIVERED, CANCELLED
        [special_instructions] [varchar](500) NULL,
        [total_ordered_qty] [int] NOT NULL DEFAULT (0),
        [total_planned_qty] [int] NOT NULL DEFAULT (0),
        [total_loaded_qty] [int] NOT NULL DEFAULT (0),
        [total_delivered_qty] [int] NOT NULL DEFAULT (0),
        [created_by] [int] NOT NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        [updated_by] [int] NULL,
        [updated_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_DELIVERY_ORDER] PRIMARY KEY CLUSTERED ([order_id] ASC),
        CONSTRAINT [FK_DELIVERY_ORDER_CUSTOMER] FOREIGN KEY([customer_id]) REFERENCES [dbo].[CUSTOMER_MASTER] ([CustomerId]),
        CONSTRAINT [FK_DELIVERY_ORDER_LOCATION] FOREIGN KEY([location_id]) REFERENCES [dbo].[LOCATION_MASTER] ([LocationId]),
        CONSTRAINT [FK_DELIVERY_ORDER_RATE_CONTRACT] FOREIGN KEY([rate_contract_id]) REFERENCES [dbo].[RATE_CONTRACT_MASTER] ([rate_contract_id]),
        CONSTRAINT [CHK_DELIVERY_ORDER_PRIORITY] CHECK ([priority] IN ('URGENT', 'HIGH', 'NORMAL', 'LOW')),
        CONSTRAINT [CHK_DELIVERY_ORDER_STATUS] CHECK ([order_status] IN ('PENDING', 'CONFIRMED', 'ASSIGNED', 'LOADED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
        CONSTRAINT [CHK_DELIVERY_ORDER_DATES] CHECK ([order_date] <= [requested_delivery_date]),
        CONSTRAINT [CHK_DELIVERY_ORDER_QUANTITIES] CHECK ([total_ordered_qty] >= 0 AND [total_planned_qty] >= 0 AND [total_loaded_qty] >= 0 AND [total_delivered_qty] >= 0),
        CONSTRAINT [UQ_DELIVERY_ORDER_NUMBER] UNIQUE ([order_number])
    );
END
GO

-- 2. Delivery Order Line Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELIVERY_ORDER_LINE' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DELIVERY_ORDER_LINE](
        [order_line_id] [bigint] IDENTITY(1,1) NOT NULL,
        [order_id] [bigint] NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [cylinder_description] [varchar](100) NOT NULL,
        [ordered_qty] [int] NOT NULL,
        [planned_qty] [int] NOT NULL DEFAULT (0),
        [loaded_qty] [int] NOT NULL DEFAULT (0),
        [delivered_qty] [int] NOT NULL DEFAULT (0),
        [rate_applied] [decimal](10, 2) NOT NULL,
        [line_amount] [decimal](12, 2) NOT NULL,
        CONSTRAINT [PK_DELIVERY_ORDER_LINE] PRIMARY KEY CLUSTERED ([order_line_id] ASC),
        CONSTRAINT [FK_DELIVERY_ORDER_LINE_ORDER] FOREIGN KEY([order_id]) REFERENCES [dbo].[DELIVERY_ORDER] ([order_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_DELIVERY_ORDER_LINE_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId]),
        CONSTRAINT [CHK_DELIVERY_ORDER_LINE_QUANTITIES] CHECK ([ordered_qty] >= 0 AND [planned_qty] >= 0 AND [loaded_qty] >= 0 AND [delivered_qty] >= 0)
    );
END
GO

-- 3. Delivery Plan Table (Daily Planning - Vehicle/Driver Assignment)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELIVERY_PLAN' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DELIVERY_PLAN](
        [plan_id] [bigint] IDENTITY(1,1) NOT NULL,
        [plan_date] [date] NOT NULL,
        [vehicle_id] [int] NOT NULL,
        [driver_id] [int] NOT NULL,
        [plan_status] [varchar](20) NOT NULL DEFAULT ('DRAFT'), -- DRAFT, CONFIRMED, LOADING, LOADED, DISPATCHED, COMPLETED
        [planned_departure_time] [time] NULL,
        [actual_departure_time] [time] NULL,
        [planned_return_time] [time] NULL,
        [actual_return_time] [time] NULL,
        [total_planned_orders] [int] NOT NULL DEFAULT (0),
        [total_loaded_orders] [int] NOT NULL DEFAULT (0),
        [total_delivered_orders] [int] NOT NULL DEFAULT (0),
        [notes] [varchar](500) NULL,
        [created_by] [int] NOT NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        [updated_by] [int] NULL,
        [updated_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_DELIVERY_PLAN] PRIMARY KEY CLUSTERED ([plan_id] ASC),
        CONSTRAINT [FK_DELIVERY_PLAN_VEHICLE] FOREIGN KEY([vehicle_id]) REFERENCES [dbo].[VEHICLE_MASTER] ([vehicle_id]),
        CONSTRAINT [FK_DELIVERY_PLAN_DRIVER] FOREIGN KEY([driver_id]) REFERENCES [dbo].[DRIVER_MASTER] ([driver_id]),
        CONSTRAINT [CHK_DELIVERY_PLAN_STATUS] CHECK ([plan_status] IN ('DRAFT', 'CONFIRMED', 'LOADING', 'LOADED', 'DISPATCHED', 'COMPLETED')),
        CONSTRAINT [CHK_DELIVERY_PLAN_QUANTITIES] CHECK ([total_planned_orders] >= 0 AND [total_loaded_orders] >= 0 AND [total_delivered_orders] >= 0),
        CONSTRAINT [UQ_DELIVERY_PLAN_VEHICLE_DATE] UNIQUE ([vehicle_id], [plan_date])
    );
END
GO

-- 4. Delivery Plan Order Mapping Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELIVERY_PLAN_ORDER' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DELIVERY_PLAN_ORDER](
        [plan_order_id] [bigint] IDENTITY(1,1) NOT NULL,
        [plan_id] [bigint] NOT NULL,
        [order_id] [bigint] NOT NULL,
        [sequence_number] [int] NOT NULL, -- Delivery sequence for the vehicle
        [planned_delivery_time] [time] NULL,
        [actual_delivery_time] [time] NULL,
        [delivery_status] [varchar](20) NOT NULL DEFAULT ('PLANNED'), -- PLANNED, LOADED, DELIVERED, PARTIAL, CANCELLED
        [notes] [varchar](200) NULL,
        CONSTRAINT [PK_DELIVERY_PLAN_ORDER] PRIMARY KEY CLUSTERED ([plan_order_id] ASC),
        CONSTRAINT [FK_DELIVERY_PLAN_ORDER_PLAN] FOREIGN KEY([plan_id]) REFERENCES [dbo].[DELIVERY_PLAN] ([plan_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_DELIVERY_PLAN_ORDER_ORDER] FOREIGN KEY([order_id]) REFERENCES [dbo].[DELIVERY_ORDER] ([order_id]),
        CONSTRAINT [CHK_DELIVERY_PLAN_ORDER_STATUS] CHECK ([delivery_status] IN ('PLANNED', 'LOADED', 'DELIVERED', 'PARTIAL', 'CANCELLED')),
        CONSTRAINT [CHK_DELIVERY_PLAN_ORDER_SEQUENCE] CHECK ([sequence_number] > 0),
        CONSTRAINT [UQ_DELIVERY_PLAN_ORDER_PLAN_SEQUENCE] UNIQUE ([plan_id], [sequence_number]),
        CONSTRAINT [UQ_DELIVERY_PLAN_ORDER_PLAN_ORDER] UNIQUE ([plan_id], [order_id])
    );
END
GO

-- 5. Loading Transaction Header Table (Loading Process)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LOADING_TRANSACTION' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[LOADING_TRANSACTION](
        [loading_id] [bigint] IDENTITY(1,1) NOT NULL,
        [plan_id] [bigint] NOT NULL,
        [loading_date] [date] NOT NULL,
        [loading_time] [time] NOT NULL,
        [loading_status] [varchar](20) NOT NULL DEFAULT ('IN_PROGRESS'), -- IN_PROGRESS, COMPLETED, CANCELLED
        [loaded_by] [int] NOT NULL,
        [supervisor_id] [int] NULL,
        [total_loaded_qty] [int] NOT NULL DEFAULT (0),
        [total_variances] [int] NOT NULL DEFAULT (0), -- Shortages or excesses
        [loading_notes] [varchar](500) NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        [completed_at] [datetime] NULL,
        CONSTRAINT [PK_LOADING_TRANSACTION] PRIMARY KEY CLUSTERED ([loading_id] ASC),
        CONSTRAINT [FK_LOADING_TRANSACTION_PLAN] FOREIGN KEY([plan_id]) REFERENCES [dbo].[DELIVERY_PLAN] ([plan_id]),
        CONSTRAINT [FK_LOADING_TRANSACTION_LOADED_BY] FOREIGN KEY([loaded_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [FK_LOADING_TRANSACTION_SUPERVISOR] FOREIGN KEY([supervisor_id]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [CHK_LOADING_TRANSACTION_STATUS] CHECK ([loading_status] IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
        CONSTRAINT [CHK_LOADING_TRANSACTION_QUANTITIES] CHECK ([total_loaded_qty] >= 0),
        CONSTRAINT [UQ_LOADING_TRANSACTION_PLAN] UNIQUE ([plan_id])
    );
END
GO

-- 6. Loading Transaction Line Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LOADING_TRANSACTION_LINE' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[LOADING_TRANSACTION_LINE](
        [loading_line_id] [bigint] IDENTITY(1,1) NOT NULL,
        [loading_id] [bigint] NOT NULL,
        [order_id] [bigint] NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [planned_qty] [int] NOT NULL,
        [loaded_qty] [int] NOT NULL,
        [variance_qty] [int] NOT NULL DEFAULT (0), -- loaded_qty - planned_qty
        [variance_reason] [varchar](100) NULL, -- STOCK_SHORTAGE, DAMAGE, WRONG_TYPE, etc.
        [batch_number] [varchar](50) NULL,
        [serial_numbers] [varchar](500) NULL, -- Comma-separated serial numbers
        CONSTRAINT [PK_LOADING_TRANSACTION_LINE] PRIMARY KEY CLUSTERED ([loading_line_id] ASC),
        CONSTRAINT [FK_LOADING_TRANSACTION_LINE_LOADING] FOREIGN KEY([loading_id]) REFERENCES [dbo].[LOADING_TRANSACTION] ([loading_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_LOADING_TRANSACTION_LINE_ORDER] FOREIGN KEY([order_id]) REFERENCES [dbo].[DELIVERY_ORDER] ([order_id]),
        CONSTRAINT [FK_LOADING_TRANSACTION_LINE_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId]),
        CONSTRAINT [CHK_LOADING_TRANSACTION_LINE_QUANTITIES] CHECK ([planned_qty] >= 0 AND [loaded_qty] >= 0)
    );
END
GO

-- 7. Delivery Reconciliation Header Table (End-of-Day Reconciliation)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELIVERY_RECONCILIATION' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DELIVERY_RECONCILIATION](
        [reconciliation_id] [bigint] IDENTITY(1,1) NOT NULL,
        [plan_id] [bigint] NOT NULL,
        [reconciliation_date] [date] NOT NULL,
        [reconciliation_status] [varchar](20) NOT NULL DEFAULT ('PENDING'), -- PENDING, IN_PROGRESS, COMPLETED, APPROVED
        [total_orders] [int] NOT NULL DEFAULT (0),
        [total_delivered_orders] [int] NOT NULL DEFAULT (0),
        [total_partial_deliveries] [int] NOT NULL DEFAULT (0),
        [total_cancelled_orders] [int] NOT NULL DEFAULT (0),
        [total_variances] [int] NOT NULL DEFAULT (0),
        [inventory_adjustments] [int] NOT NULL DEFAULT (0),
        [reconciled_by] [int] NOT NULL,
        [approved_by] [int] NULL,
        [approved_at] [datetime] NULL,
        [reconciliation_notes] [varchar](1000) NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        [updated_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_DELIVERY_RECONCILIATION] PRIMARY KEY CLUSTERED ([reconciliation_id] ASC),
        CONSTRAINT [FK_DELIVERY_RECONCILIATION_PLAN] FOREIGN KEY([plan_id]) REFERENCES [dbo].[DELIVERY_PLAN] ([plan_id]),
        CONSTRAINT [FK_DELIVERY_RECONCILIATION_RECONCILED_BY] FOREIGN KEY([reconciled_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [FK_DELIVERY_RECONCILIATION_APPROVED_BY] FOREIGN KEY([approved_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [CHK_DELIVERY_RECONCILIATION_STATUS] CHECK ([reconciliation_status] IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED')),
        CONSTRAINT [CHK_DELIVERY_RECONCILIATION_QUANTITIES] CHECK ([total_orders] >= 0 AND [total_delivered_orders] >= 0 AND [total_partial_deliveries] >= 0 AND [total_cancelled_orders] >= 0),
        CONSTRAINT [UQ_DELIVERY_RECONCILIATION_PLAN] UNIQUE ([plan_id])
    );
END
GO

-- 8. Delivery Reconciliation Line Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELIVERY_RECONCILIATION_LINE' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DELIVERY_RECONCILIATION_LINE](
        [reconciliation_line_id] [bigint] IDENTITY(1,1) NOT NULL,
        [reconciliation_id] [bigint] NOT NULL,
        [order_id] [bigint] NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [planned_qty] [int] NOT NULL,
        [loaded_qty] [int] NOT NULL,
        [delivered_qty] [int] NOT NULL,
        [returned_qty] [int] NOT NULL DEFAULT (0),
        [variance_qty] [int] NOT NULL DEFAULT (0), -- delivered_qty - loaded_qty
        [variance_reason] [varchar](100) NULL, -- CUSTOMER_REJECTED, DAMAGE, LOST, etc.
        [inventory_adjustment] [int] NOT NULL DEFAULT (0), -- How much to adjust inventory
        [adjustment_reason] [varchar](200) NULL,
        [resolution_status] [varchar](20) NOT NULL DEFAULT ('PENDING'), -- PENDING, RESOLVED, ESCALATED
        [resolution_notes] [varchar](500) NULL,
        CONSTRAINT [PK_DELIVERY_RECONCILIATION_LINE] PRIMARY KEY CLUSTERED ([reconciliation_line_id] ASC),
        CONSTRAINT [FK_DELIVERY_RECONCILIATION_LINE_RECONCILIATION] FOREIGN KEY([reconciliation_id]) REFERENCES [dbo].[DELIVERY_RECONCILIATION] ([reconciliation_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_DELIVERY_RECONCILIATION_LINE_ORDER] FOREIGN KEY([order_id]) REFERENCES [dbo].[DELIVERY_ORDER] ([order_id]),
        CONSTRAINT [FK_DELIVERY_RECONCILIATION_LINE_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId]),
        CONSTRAINT [CHK_DELIVERY_RECONCILIATION_LINE_QUANTITIES] CHECK ([planned_qty] >= 0 AND [loaded_qty] >= 0 AND [delivered_qty] >= 0 AND [returned_qty] >= 0),
        CONSTRAINT [CHK_DELIVERY_RECONCILIATION_LINE_RESOLUTION] CHECK ([resolution_status] IN ('PENDING', 'RESOLVED', 'ESCALATED'))
    );
END
GO

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DELIVERY_ORDER_CUSTOMER_DATE')
BEGIN
    CREATE INDEX [IX_DELIVERY_ORDER_CUSTOMER_DATE] ON [dbo].[DELIVERY_ORDER]
    ([customer_id], [requested_delivery_date] DESC, [order_status]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DELIVERY_ORDER_STATUS_DATE')
BEGIN
    CREATE INDEX [IX_DELIVERY_ORDER_STATUS_DATE] ON [dbo].[DELIVERY_ORDER]
    ([order_status], [requested_delivery_date] DESC);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DELIVERY_PLAN_DATE_STATUS')
BEGIN
    CREATE INDEX [IX_DELIVERY_PLAN_DATE_STATUS] ON [dbo].[DELIVERY_PLAN]
    ([plan_date] DESC, [plan_status]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DELIVERY_PLAN_VEHICLE')
BEGIN
    CREATE INDEX [IX_DELIVERY_PLAN_VEHICLE] ON [dbo].[DELIVERY_PLAN]
    ([vehicle_id], [plan_date] DESC);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LOADING_TRANSACTION_PLAN')
BEGIN
    CREATE INDEX [IX_LOADING_TRANSACTION_PLAN] ON [dbo].[LOADING_TRANSACTION]
    ([plan_id], [loading_status]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DELIVERY_RECONCILIATION_PLAN')
BEGIN
    CREATE INDEX [IX_DELIVERY_RECONCILIATION_PLAN] ON [dbo].[DELIVERY_RECONCILIATION]
    ([plan_id], [reconciliation_status]);
END
GO

-- Add foreign key constraints to existing DELIVERY_TRANSACTION table to link with orders
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DELIVERY_TRANSACTION_ORDER')
BEGIN
    ALTER TABLE [dbo].[DELIVERY_TRANSACTION] ADD
        [order_id] [bigint] NULL,
        CONSTRAINT [FK_DELIVERY_TRANSACTION_ORDER] FOREIGN KEY([order_id]) REFERENCES [dbo].[DELIVERY_ORDER] ([order_id]);
END
GO

-- Add delivery type to distinguish between planned and unplanned deliveries
IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = 'delivery_type' AND object_id = OBJECT_ID('DELIVERY_TRANSACTION'))
BEGIN
    ALTER TABLE [dbo].[DELIVERY_TRANSACTION] ADD
        [delivery_type] [varchar](20) NOT NULL DEFAULT ('PLANNED'),
        CONSTRAINT [CHK_DELIVERY_TRANSACTION_TYPE] CHECK ([delivery_type] IN ('PLANNED', 'UNPLANNED', 'EMERGENCY'));
END
GO

PRINT 'Delivery Orders and Complete Delivery Process Flow tables created successfully!';
GO
