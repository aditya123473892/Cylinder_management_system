-- Fix empty cylinders stored with customers
-- Empty cylinders should be at YARD/PLANT, not with customers

USE [Cylinder-Management];
GO

PRINT 'Finding empty cylinders incorrectly stored with customers...';
PRINT '========================================================';

-- Check current empty cylinders with customers
SELECT 
    'CURRENT ISSUE' as status,
    cil.inventory_id,
    cil.cylinder_type_id,
    ctm.Capacity as cylinder_description,
    cil.location_type,
    cil.location_reference_id,
    cil.cylinder_status,
    cil.quantity,
    cil.last_updated
FROM CYLINDER_LOCATION_INVENTORY cil
JOIN CYLINDER_TYPE_MASTER ctm ON cil.cylinder_type_id = ctm.CylinderTypeId
WHERE cil.location_type = 'CUSTOMER'
  AND cil.cylinder_status = 'EMPTY'
ORDER BY cil.cylinder_type_id, cil.location_reference_id;
GO

-- Calculate how many empty cylinders are with customers
PRINT 'Summary of empty cylinders with customers:';
SELECT 
    cil.cylinder_type_id,
    ctm.Capacity as cylinder_description,
    cil.location_reference_id,
    SUM(cil.quantity) as total_empty_with_customers
FROM CYLINDER_LOCATION_INVENTORY cil
JOIN CYLINDER_TYPE_MASTER ctm ON cil.cylinder_type_id = ctm.CylinderTypeId
WHERE cil.location_type = 'CUSTOMER'
  AND cil.cylinder_status = 'EMPTY'
GROUP BY cil.cylinder_type_id, ctm.Capacity, cil.location_reference_id
ORDER BY cil.cylinder_type_id, cil.location_reference_id;
GO

-- Fix: Move all empty cylinders from customers to YARD
PRINT 'Moving empty cylinders from CUSTOMER to YARD...';

BEGIN TRANSACTION;

-- Create a record of the fix
INSERT INTO CYLINDER_MOVEMENT_LOG (
    cylinder_type_id,
    from_location_type,
    from_location_reference_id,
    to_location_type,
    to_location_reference_id,
    quantity,
    movement_type,
    reference_transaction_id,
    moved_by,
    movement_date,
    notes
)
SELECT 
    cil.cylinder_type_id,
    'CUSTOMER' as from_location_type,
    cil.location_reference_id,
    'YARD' as to_location_type,
    NULL as to_location_reference_id,
    cil.quantity,
    'BUSINESS_LOGIC_FIX' as movement_type,
    NULL as reference_transaction_id,
    1 as moved_by,
    GETDATE() as movement_date,
    'Fixed business logic: Moved empty cylinders from customer to YARD'
FROM CYLINDER_LOCATION_INVENTORY cil
WHERE cil.location_type = 'CUSTOMER'
  AND cil.cylinder_status = 'EMPTY';

-- Remove empty cylinders from customers
DELETE FROM CYLINDER_LOCATION_INVENTORY
WHERE location_type = 'CUSTOMER'
  AND cylinder_status = 'EMPTY';

-- Add empty cylinders to YARD (consolidate existing or create new)
MERGE INTO CYLINDER_LOCATION_INVENTORY AS target
USING (
    SELECT 
        cil.cylinder_type_id,
        SUM(cil.quantity) as total_quantity
    FROM CYLINDER_LOCATION_INVENTORY cil
    WHERE cil.location_type = 'CUSTOMER'
      AND cil.cylinder_status = 'EMPTY'
    GROUP BY cil.cylinder_type_id
) AS source
ON (target.cylinder_type_id = source.cylinder_type_id 
    AND target.location_type = 'YARD' 
    AND target.cylinder_status = 'EMPTY')
WHEN MATCHED THEN
    UPDATE SET 
        target.quantity = target.quantity + source.total_quantity,
        target.last_updated = GETDATE(),
        target.updated_by = 1
WHEN NOT MATCHED THEN
    INSERT (
        cylinder_type_id, 
        location_type, 
        location_reference_id, 
        location_reference_name,
        cylinder_status, 
        quantity, 
        updated_by
    ) VALUES (
        source.cylinder_type_id,
        'YARD',
        NULL,
        NULL,
        'EMPTY',
        source.total_quantity,
        1
    );

COMMIT TRANSACTION;
GO

PRINT 'Empty cylinders moved from customers to YARD successfully!';
GO

-- Verify the fix
PRINT 'Verification - Empty cylinders should now be in YARD:';
SELECT 
    cil.cylinder_type_id,
    ctm.Capacity as cylinder_description,
    cil.location_type,
    cil.cylinder_status,
    cil.quantity,
    cil.last_updated
FROM CYLINDER_LOCATION_INVENTORY cil
JOIN CYLINDER_TYPE_MASTER ctm ON cil.cylinder_type_id = ctm.CylinderTypeId
WHERE cil.cylinder_status = 'EMPTY'
ORDER BY cil.cylinder_type_id, cil.location_type;
GO

PRINT 'Business logic fix completed!';
PRINT 'Empty cylinders are now correctly stored in YARD, not with customers.';
GO
