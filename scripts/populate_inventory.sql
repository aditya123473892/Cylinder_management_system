USE [Cylinder-Management]
GO

-- Insert initial inventory data for each cylinder type in YARD location
-- This assumes you have cylinder types already created

INSERT INTO [dbo].[CYLINDER_LOCATION_INVENTORY] (
    [cylinder_type_id],
    [location_type],
    [quantity],
    [updated_by]
)
SELECT
    ctm.CylinderTypeId,
    'YARD',
    100,  -- Starting quantity for each cylinder type
    1     -- Admin user ID
FROM [dbo].[CYLINDER_TYPE_MASTER] ctm
WHERE NOT EXISTS (
    SELECT 1 FROM [dbo].[CYLINDER_LOCATION_INVENTORY] cli
    WHERE cli.cylinder_type_id = ctm.CylinderTypeId
    AND cli.location_type = 'YARD'
)
GO

-- Verify the inserted data
SELECT
    ctm.Capacity as 'Cylinder Type',
    cli.location_type as 'Location',
    cli.quantity as 'Quantity',
    cli.last_updated as 'Last Updated'
FROM [dbo].[CYLINDER_LOCATION_INVENTORY] cli
JOIN [dbo].[CYLINDER_TYPE_MASTER] ctm ON cli.cylinder_type_id = ctm.CylinderTypeId
ORDER BY ctm.Capacity
GO

PRINT 'Inventory initialization completed successfully!'
GO
