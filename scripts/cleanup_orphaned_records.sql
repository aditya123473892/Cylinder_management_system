-- Check for orphaned inventory records (cylinder types that don't exist)
USE [Cylinder-Management];

-- Find inventory records with deleted cylinder types
SELECT 
    inv.inventory_id,
    inv.cylinder_type_id,
    inv.location_type,
    inv.quantity,
    inv.cylinder_status,
    inv.last_updated
FROM [dbo].[CYLINDER_LOCATION_INVENTORY] inv
LEFT JOIN [dbo].[CYLINDER_TYPE_MASTER] ct ON inv.cylinder_type_id = ct.CylinderTypeId
WHERE ct.CylinderTypeId IS NULL
ORDER BY inv.inventory_id;

-- Find movement logs with deleted cylinder types
SELECT 
    ml.movement_id,
    ml.cylinder_type_id,
    ml.movement_type,
    ml.quantity,
    ml.movement_date
FROM [dbo].[CYLINDER_MOVEMENT_LOG] ml
LEFT JOIN [dbo].[CYLINDER_TYPE_MASTER] ct ON ml.cylinder_type_id = ct.CylinderTypeId
WHERE ct.CylinderTypeId IS NULL
ORDER BY ml.movement_id;

-- Show what cylinder types actually exist
SELECT 
    [CylinderTypeId],
    [Capacity],
    [IsActive]
FROM [dbo].[CYLINDER_TYPE_MASTER]
ORDER BY [CylinderTypeId];
