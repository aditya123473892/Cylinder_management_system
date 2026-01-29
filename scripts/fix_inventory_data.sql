USE [Cylinder-Management]
GO

-- Fix existing inventory data by populating location_reference_name
-- For YARD locations, set a default name
UPDATE CYLINDER_LOCATION_INVENTORY
SET location_reference_name = 'Main Storage Yard'
WHERE location_type = 'YARD' AND location_reference_name IS NULL;

-- For VEHICLE locations, populate names from VEHICLE_MASTER
UPDATE cli
SET cli.location_reference_name = vm.vehicle_number
FROM CYLINDER_LOCATION_INVENTORY cli
JOIN VEHICLE_MASTER vm ON cli.location_reference_id = vm.vehicle_id
WHERE cli.location_type = 'VEHICLE' AND cli.location_reference_name IS NULL;

-- For CUSTOMER locations, populate names from CUSTOMER_MASTER
UPDATE cli
SET cli.location_reference_name = cm.customer_name
FROM CYLINDER_LOCATION_INVENTORY cli
JOIN CUSTOMER_MASTER cm ON cli.location_reference_id = cm.customer_id
WHERE cli.location_type = 'CUSTOMER' AND cli.location_reference_name IS NULL;

-- Verify the fixes
SELECT
    location_type,
    location_reference_name,
    COUNT(*) as Records_Count
FROM CYLINDER_LOCATION_INVENTORY
WHERE location_reference_name IS NOT NULL
GROUP BY location_type, location_reference_name
ORDER BY location_type, location_reference_name;

-- Check if any records still have NULL location_reference_name
SELECT
    'Records with NULL location_reference_name:' as Info,
    COUNT(*) as Count
FROM CYLINDER_LOCATION_INVENTORY
WHERE location_reference_name IS NULL;

-- Show final inventory summary
SELECT
    ctm.Capacity as 'Cylinder Type',
    cli.location_type as 'Location Type',
    cli.location_reference_name as 'Location Name',
    cli.quantity as 'Quantity'
FROM CYLINDER_LOCATION_INVENTORY cli
JOIN CYLINDER_TYPE_MASTER ctm ON cli.cylinder_type_id = ctm.CylinderTypeId
ORDER BY ctm.Capacity, cli.location_type, cli.location_reference_name;

PRINT 'Inventory data fix completed successfully!'
GO
