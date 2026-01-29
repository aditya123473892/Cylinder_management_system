-- Debug script to check inventory data
USE [Cylinder-Management];

-- Check all inventory data
SELECT 
    cli.inventory_id,
    cli.cylinder_type_id,
    ct.Capacity as cylinder_type_name,
    cli.location_type,
    cli.location_reference_id,
    cli.location_reference_name,
    cli.cylinder_status,
    cli.quantity,
    cli.last_updated,
    cli.updated_by
FROM CYLINDER_LOCATION_INVENTORY cli
INNER JOIN CYLINDER_TYPE_MASTER ct ON cli.cylinder_type_id = ct.CylinderTypeId
ORDER BY cli.location_type, cli.cylinder_type_id, cli.cylinder_status;

-- Check specifically for YARD location with FILLED cylinders
SELECT 
    cli.cylinder_type_id,
    ct.Capacity as cylinder_type_name,
    cli.cylinder_status,
    cli.quantity
FROM CYLINDER_LOCATION_INVENTORY cli
INNER JOIN CYLINDER_TYPE_MASTER ct ON cli.cylinder_type_id = ct.CylinderTypeId
WHERE cli.location_type = 'YARD' 
AND cli.cylinder_status = 'FILLED'
AND cli.location_reference_id IS NULL
ORDER BY cli.cylinder_type_id;

-- Check all cylinder types
SELECT CylinderTypeId, Capacity FROM CYLINDER_TYPE_MASTER ORDER BY CylinderTypeId;

-- Check if there's any inventory at all
SELECT COUNT(*) as total_inventory_records FROM CYLINDER_LOCATION_INVENTORY;

-- Check inventory by location type
SELECT location_type, COUNT(*) as record_count, SUM(quantity) as total_cylinders
FROM CYLINDER_LOCATION_INVENTORY
GROUP BY location_type;
