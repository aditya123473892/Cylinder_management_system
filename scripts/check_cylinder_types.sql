-- Check what cylinder types exist in the database
USE [Cylinder-Management];

SELECT 
    [CylinderTypeId],
    [Capacity],
    [HeightCM],
    [IsActive],
    [CreatedDate]
FROM [dbo].[CYLINDER_TYPE_MASTER]
ORDER BY [CylinderTypeId];

-- Also check if there are any existing inventory records
SELECT 
    [inventory_id],
    [cylinder_type_id],
    [location_type],
    [quantity],
    [cylinder_status]
FROM [dbo].[CYLINDER_LOCATION_INVENTORY]
ORDER BY [cylinder_type_id];
