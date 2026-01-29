USE [Cylinder-Management]
GO

-- Check current inventory data
SELECT
    'Current Inventory Data:' as Info,
    COUNT(*) as Total_Records
FROM CYLINDER_LOCATION_INVENTORY;

SELECT TOP 10
    inventory_id,
    cylinder_type_id,
    location_type,
    location_reference_id,
    location_reference_name,
    quantity,
    last_updated
FROM CYLINDER_LOCATION_INVENTORY
ORDER BY inventory_id;

-- Check if location_reference_name needs to be populated
SELECT
    location_type,
    COUNT(*) as Records_Count,
    SUM(CASE WHEN location_reference_name IS NULL THEN 1 ELSE 0 END) as Null_Reference_Name_Count
FROM CYLINDER_LOCATION_INVENTORY
GROUP BY location_type;

-- Check cylinder types
SELECT
    'Cylinder Types:' as Info,
    COUNT(*) as Total_Cylinder_Types
FROM CYLINDER_TYPE_MASTER;

SELECT
    CylinderTypeId,
    Capacity
FROM CYLINDER_TYPE_MASTER
ORDER BY CylinderTypeId;
GO
