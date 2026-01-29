-- Safe Inventory Initialization Script
-- This script requires manual confirmation and actual physical counts

USE [Cylinder-Management];
GO

PRINT 'Safe Inventory Initialization';
PRINT '============================';
PRINT '';
PRINT 'This script helps initialize inventory with REAL physical counts.';
PRINT 'NEVER use this script without verifying actual physical inventory!';
PRINT '';

-- Show current cylinder types that need inventory initialization
PRINT 'Cylinder types that may need inventory initialization:';
PRINT '--------------------------------------------------------';

SELECT 
    ctm.CylinderTypeId,
    ctm.Capacity as cylinder_description,
    CASE 
        WHEN cil.cylinder_type_id IS NULL THEN 'NO INVENTORY RECORD'
        ELSE 'HAS INVENTORY'
    END as inventory_status,
    ISNULL(cil.quantity, 0) as current_quantity
FROM CYLINDER_TYPE_MASTER ctm
LEFT JOIN CYLINDER_LOCATION_INVENTORY cil ON ctm.CylinderTypeId = cil.cylinder_type_id AND cil.location_type = 'YARD'
ORDER BY ctm.CylinderTypeId;
GO

-- Template for manual inventory insertion
PRINT 'Template for manual inventory insertion:';
PRINT '======================================';
PRINT '';
PRINT 'Use the following template to insert REAL physical inventory counts:';
PRINT '';

-- Generate template SQL for manual insertion
SELECT 
    '-- Template for Cylinder Type ID: ' + CAST(ctm.CylinderTypeId as varchar) + ' (' + ctm.Capacity + ')',
    'INSERT INTO CYLINDER_LOCATION_INVENTORY (',
    '    cylinder_type_id,',
    '    location_type,',
    '    location_reference_id,',
    '    location_reference_name,',
    '    quantity,',
    '    updated_by',
    ') VALUES (',
    '    ' + CAST(ctm.CylinderTypeId as varchar) + ', -- cylinder_type_id',
    '    ''YARD'', -- location_type',
    '    NULL, -- location_reference_id (NULL for YARD)',
    '    NULL, -- location_reference_name (NULL for YARD)',
    '    [ACTUAL_COUNT], -- REPLACE with real physical count',
    '    1 -- updated_by (admin user ID)',
    ');',
    'GO',
    ''
FROM CYLINDER_TYPE_MASTER ctm
WHERE NOT EXISTS (
    SELECT 1 FROM CYLINDER_LOCATION_INVENTORY cil 
    WHERE cil.cylinder_type_id = ctm.CylinderTypeId 
      AND cil.location_type = 'YARD'
)
ORDER BY ctm.CylinderTypeId;
GO

-- Safety check - show current total inventory
PRINT 'Current Inventory Summary:';
PRINT '==========================';

SELECT 
    location_type,
    COUNT(*) as distinct_cylinder_types,
    SUM(quantity) as total_cylinders,
    AVG(quantity) as avg_quantity_per_type
FROM CYLINDER_LOCATION_INVENTORY
GROUP BY location_type
ORDER BY location_type;
GO

-- Warning and instructions
PRINT '';
PRINT '⚠️  IMPORTANT SAFETY INSTRUCTIONS:';
PRINT '==================================';
PRINT '1. Count physical cylinders in your yard BEFORE running any INSERT statements';
PRINT '2. Replace [ACTUAL_COUNT] with the real physical count for each cylinder type';
PRINT '3. Only insert inventory that physically exists';
PRINT '4. Keep a record of all manual inventory adjustments';
PRINT '5. Run this script in READ-ONLY mode first to review before making changes';
PRINT '';
PRINT 'NEVER auto-generate inventory counts - always use physical verification!';
PRINT '';

-- Create a log entry for this initialization attempt
INSERT INTO CYLINDER_MOVEMENT_LOG (
    cylinder_type_id,
    from_location_type,
    to_location_type,
    quantity,
    movement_type,
    reference_transaction_id,
    moved_by,
    movement_date,
    notes
)
SELECT 
    NULL as cylinder_type_id, -- General log entry
    'SYSTEM' as from_location_type,
    'SYSTEM' as to_location_type,
    0 as quantity,
    'INITIALIZATION_REVIEW' as movement_type,
    NULL as reference_transaction_id,
    1 as moved_by,
    GETDATE() as movement_date,
    'Safe inventory initialization script executed - manual review required before inserting actual inventory' as notes;
GO

PRINT 'Safe inventory initialization script completed!';
PRINT 'Review the output above and manually insert inventory as needed.';
GO
