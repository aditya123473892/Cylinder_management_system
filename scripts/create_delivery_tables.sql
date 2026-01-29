-- Create Rate Contract Master Table
USE [Cylinder-Management];

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RATE_CONTRACT_MASTER' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[RATE_CONTRACT_MASTER](
        [rate_contract_id] [int] IDENTITY(1,1) NOT NULL,
        [contract_name] [varchar](100) NOT NULL,
        [customer_type] [varchar](20) NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [rate_per_cylinder] [decimal](10, 2) NOT NULL,
        [valid_from] [date] NOT NULL,
        [valid_to] [date] NOT NULL,
        [is_active] [bit] NOT NULL DEFAULT ((1)),
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_RATE_CONTRACT_MASTER] PRIMARY KEY CLUSTERED ([rate_contract_id] ASC),
        CONSTRAINT [CHK_RATE_CONTRACT_CUSTOMER_TYPE] CHECK ([customer_type] IN ('DIRECT', 'SUB_DEALER', 'ALL')),
        CONSTRAINT [CHK_RATE_CONTRACT_DATES] CHECK ([valid_from] <= [valid_to]),
        CONSTRAINT [FK_RATE_CONTRACT_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId])
    );
END
GO

-- Create Delivery Transaction Header Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELIVERY_TRANSACTION' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DELIVERY_TRANSACTION](
        [delivery_id] [bigint] IDENTITY(1,1) NOT NULL,
        [customer_id] [int] NOT NULL,
        [customer_name] [varchar](100) NOT NULL,
        [location_id] [int] NOT NULL,
        [location_name] [varchar](100) NOT NULL,
        [vehicle_id] [int] NOT NULL,
        [driver_id] [int] NOT NULL,
        [rate_contract_id] [int] NOT NULL,
        [delivery_date] [date] NOT NULL,
        [delivery_time] [time] NOT NULL,
        [total_delivered_qty] [int] NOT NULL DEFAULT (0),
        [total_returned_qty] [int] NOT NULL DEFAULT (0),
        [total_net_qty] [int] NOT NULL DEFAULT (0),
        [total_bill_amount] [decimal](12, 2) NOT NULL DEFAULT (0),
        [created_by] [int] NOT NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_DELIVERY_TRANSACTION] PRIMARY KEY CLUSTERED ([delivery_id] ASC),
        CONSTRAINT [FK_DELIVERY_CUSTOMER] FOREIGN KEY([customer_id]) REFERENCES [dbo].[CUSTOMER_MASTER] ([CustomerId]),
        CONSTRAINT [FK_DELIVERY_LOCATION] FOREIGN KEY([location_id]) REFERENCES [dbo].[LOCATION_MASTER] ([LocationId]),
        CONSTRAINT [FK_DELIVERY_VEHICLE] FOREIGN KEY([vehicle_id]) REFERENCES [dbo].[VEHICLE_MASTER] ([vehicle_id]),
        CONSTRAINT [FK_DELIVERY_DRIVER] FOREIGN KEY([driver_id]) REFERENCES [dbo].[DRIVER_MASTER] ([driver_id]),
        CONSTRAINT [FK_DELIVERY_RATE_CONTRACT] FOREIGN KEY([rate_contract_id]) REFERENCES [dbo].[RATE_CONTRACT_MASTER] ([rate_contract_id]),
        CONSTRAINT [CHK_DELIVERY_QUANTITIES] CHECK ([total_delivered_qty] >= 0 AND [total_returned_qty] >= 0 AND [total_net_qty] >= 0),
        CONSTRAINT [CHK_DELIVERY_AMOUNT] CHECK ([total_bill_amount] >= 0)
    );
END
GO

-- Create Delivery Transaction Line Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DELIVERY_TRANSACTION_LINE' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[DELIVERY_TRANSACTION_LINE](
        [delivery_line_id] [bigint] IDENTITY(1,1) NOT NULL,
        [delivery_id] [bigint] NOT NULL,
        [cylinder_type_id] [int] NOT NULL,
        [cylinder_description] [varchar](100) NOT NULL,
        [delivered_qty] [int] NOT NULL,
        [returned_qty] [int] NOT NULL,
        [net_qty] AS ([delivered_qty] - [returned_qty]) PERSISTED,
        [rate_applied] [decimal](10, 2) NOT NULL,
        [billable_qty] [int] NOT NULL,
        [line_amount] [decimal](12, 2) NOT NULL,
        CONSTRAINT [PK_DELIVERY_TRANSACTION_LINE] PRIMARY KEY CLUSTERED ([delivery_line_id] ASC),
        CONSTRAINT [FK_DELIVERY_LINE_TRANSACTION] FOREIGN KEY([delivery_id]) REFERENCES [dbo].[DELIVERY_TRANSACTION] ([delivery_id]) ON DELETE CASCADE,
        CONSTRAINT [FK_DELIVERY_LINE_CYLINDER_TYPE] FOREIGN KEY([cylinder_type_id]) REFERENCES [dbo].[CYLINDER_TYPE_MASTER] ([CylinderTypeId]),
        CONSTRAINT [CHK_DELIVERY_LINE_QUANTITIES] CHECK ([delivered_qty] >= 0 AND [returned_qty] >= 0 AND [billable_qty] >= 0),
        CONSTRAINT [CHK_DELIVERY_LINE_AMOUNT] CHECK ([line_amount] >= 0),
        CONSTRAINT [CHK_DELIVERY_LINE_BILLABLE] CHECK ([billable_qty] <= [delivered_qty])
    );
END
GO

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DELIVERY_TRANSACTION_CUSTOMER_DATE')
BEGIN
    CREATE INDEX [IX_DELIVERY_TRANSACTION_CUSTOMER_DATE] ON [dbo].[DELIVERY_TRANSACTION]
    ([customer_id], [delivery_date] DESC);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DELIVERY_TRANSACTION_DATE')
BEGIN
    CREATE INDEX [IX_DELIVERY_TRANSACTION_DATE] ON [dbo].[DELIVERY_TRANSACTION]
    ([delivery_date] DESC);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RATE_CONTRACT_CYLINDER_TYPE')
BEGIN
    CREATE INDEX [IX_RATE_CONTRACT_CYLINDER_TYPE] ON [dbo].[RATE_CONTRACT_MASTER]
    ([cylinder_type_id], [customer_type]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RATE_CONTRACT_VALIDITY')
BEGIN
    CREATE INDEX [IX_RATE_CONTRACT_VALIDITY] ON [dbo].[RATE_CONTRACT_MASTER]
    ([valid_from], [valid_to], [is_active]);
END
GO

-- Insert sample rate contract data
INSERT INTO [dbo].[RATE_CONTRACT_MASTER] ([contract_name], [customer_type], [cylinder_type_id], [rate_per_cylinder], [valid_from], [valid_to], [is_active])
SELECT 'Standard Direct Customer Rate', 'DIRECT', ctm.CylinderTypeId, 150.00, '2024-01-01', '2024-12-31', 1
FROM [dbo].[CYLINDER_TYPE_MASTER] ctm
WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[RATE_CONTRACT_MASTER] rcm
    WHERE rcm.contract_name = 'Standard Direct Customer Rate'
    AND rcm.customer_type = 'DIRECT'
    AND rcm.cylinder_type_id = ctm.CylinderTypeId
)
GO

INSERT INTO [dbo].[RATE_CONTRACT_MASTER] ([contract_name], [customer_type], [cylinder_type_id], [rate_per_cylinder], [valid_from], [valid_to], [is_active])
SELECT 'Standard Sub-dealer Rate', 'SUB_DEALER', ctm.CylinderTypeId, 140.00, '2024-01-01', '2024-12-31', 1
FROM [dbo].[CYLINDER_TYPE_MASTER] ctm
WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[RATE_CONTRACT_MASTER] rcm
    WHERE rcm.contract_name = 'Standard Sub-dealer Rate'
    AND rcm.customer_type = 'SUB_DEALER'
    AND rcm.cylinder_type_id = ctm.CylinderTypeId
)
GO

INSERT INTO [dbo].[RATE_CONTRACT_MASTER] ([contract_name], [customer_type], [cylinder_type_id], [rate_per_cylinder], [valid_from], [valid_to], [is_active])
SELECT 'Universal Rate', 'ALL', ctm.CylinderTypeId, 145.00, '2024-01-01', '2024-12-31', 1
FROM [dbo].[CYLINDER_TYPE_MASTER] ctm
WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[RATE_CONTRACT_MASTER] rcm
    WHERE rcm.contract_name = 'Universal Rate'
    AND rcm.customer_type = 'ALL'
    AND rcm.cylinder_type_id = ctm.CylinderTypeId
)
GO

-- Create GR Master Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GR_MASTER' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[GR_MASTER](
        [gr_id] [bigint] IDENTITY(1,1) NOT NULL,
        [delivery_id] [bigint] NOT NULL,
        [gr_number] [varchar](50) NOT NULL,
        [gr_status] [varchar](20) NOT NULL DEFAULT ('PENDING'), -- PENDING, APPROVED, FINALIZED
        [advance_amount] [decimal](12, 2) NOT NULL DEFAULT (0),
        [approved_by] [int] NULL,
        [approved_at] [datetime] NULL,
        [finalized_by] [int] NULL,
        [finalized_at] [datetime] NULL,
        [created_by] [int] NOT NULL,
        [created_at] [datetime] NOT NULL DEFAULT (getdate()),
        [updated_at] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_GR_MASTER] PRIMARY KEY CLUSTERED ([gr_id] ASC),
        CONSTRAINT [FK_GR_DELIVERY_TRANSACTION] FOREIGN KEY([delivery_id]) REFERENCES [dbo].[DELIVERY_TRANSACTION] ([delivery_id]),
        CONSTRAINT [FK_GR_APPROVED_BY] FOREIGN KEY([approved_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [FK_GR_FINALIZED_BY] FOREIGN KEY([finalized_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [FK_GR_CREATED_BY] FOREIGN KEY([created_by]) REFERENCES [dbo].[USER_MASTER] ([UserId]),
        CONSTRAINT [CHK_GR_STATUS] CHECK ([gr_status] IN ('PENDING', 'APPROVED', 'FINALIZED')),
        CONSTRAINT [CHK_GR_ADVANCE_AMOUNT] CHECK ([advance_amount] >= 0),
        CONSTRAINT [UQ_GR_DELIVERY_ID] UNIQUE ([delivery_id])
    );
END
GO

PRINT 'Delivery transaction tables and GR tables created successfully!';
GO
