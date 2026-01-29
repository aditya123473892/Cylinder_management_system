-- Add image fields to CUSTOMER_MASTER and create DEALER_MASTER table
USE [Cylinder-Management];

-- Add Aadhaar and PAN image columns to CUSTOMER_MASTER
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CUSTOMER_MASTER') AND name = 'AadhaarImage')
BEGIN
    ALTER TABLE [dbo].[CUSTOMER_MASTER] ADD [AadhaarImage] [varbinary](max) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CUSTOMER_MASTER') AND name = 'PanImage')
BEGIN
    ALTER TABLE [dbo].[CUSTOMER_MASTER] ADD [PanImage] [varbinary](max) NULL;
END
GO

-- Create DEALER_MASTER table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DEALER_MASTER]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DEALER_MASTER] (
        [DealerId] [int] IDENTITY(1,1) NOT NULL,
        [DealerName] [nvarchar](200) NOT NULL,
        [DealerType] [nvarchar](20) NOT NULL,
        [ParentDealerId] [int] NULL,
        [LocationId] [int] NOT NULL,
        [IsActive] [bit] NOT NULL DEFAULT 1,
        [AadhaarImage] [varbinary](max) NULL,
        [PanImage] [varbinary](max) NULL,
        [CreatedAt] [datetime2](7) NOT NULL DEFAULT GETDATE(),
        [CreatedBy] [int] NULL,
        CONSTRAINT [PK_DEALER_MASTER] PRIMARY KEY CLUSTERED ([DealerId] ASC)
        WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];
END
GO

-- Add foreign key constraints for DEALER_MASTER
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_DEALER_MASTER_PARENT]') AND parent_object_id = OBJECT_ID(N'[dbo].[DEALER_MASTER]'))
BEGIN
    ALTER TABLE [dbo].[DEALER_MASTER] ADD CONSTRAINT [FK_DEALER_MASTER_PARENT] FOREIGN KEY([ParentDealerId])
    REFERENCES [dbo].[DEALER_MASTER] ([DealerId]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_DEALER_MASTER_LOCATION]') AND parent_object_id = OBJECT_ID(N'[dbo].[DEALER_MASTER]'))
BEGIN
    ALTER TABLE [dbo].[DEALER_MASTER] ADD CONSTRAINT [FK_DEALER_MASTER_LOCATION] FOREIGN KEY([LocationId])
    REFERENCES [dbo].[LOCATION_MASTER] ([LocationId]);
END
GO

-- Add indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DEALER_MASTER]') AND name = N'IX_DEALER_MASTER_DealerName')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DEALER_MASTER_DealerName] ON [dbo].[DEALER_MASTER]
    ([DealerName] ASC) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY];
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[DEALER_MASTER]') AND name = N'IX_DEALER_MASTER_LocationId')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DEALER_MASTER_LocationId] ON [dbo].[DEALER_MASTER]
    ([LocationId] ASC) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY];
END
GO

PRINT 'Customer and Dealer tables migration completed successfully!';
GO
