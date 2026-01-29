-- Fix the artificial cylinders created by the delivery bug
-- This script removes the extra cylinders that were incorrectly created

USE [Cylinder-Management];
GO

PRINT 'Fixing Artificial Cylinders Created by Delivery Bug';
PRINT '==================================================';
PRINT '';

-- Show current state before fix
PRINT 'Current Inventory State (BEFORE fix):';
SELECT 
    'BEFORE' as state,
    cil.location_type,
    cil.cylinder_status,
    cil.location_reference_id,
    cil.quantity,
    cil.last_updated
FROM CYLINDER_LOCATION_INVENTORY cil
WHERE cil.cylinder_type_id = 7
ORDER BY cil.location_type, cil.cylinder_status, cil.location_reference_id;
GO

PRINT 'Current Totals (BEFORE fix):';
SELECT 
    'BEFORE' as state,
    cil.location_type,
    cil.cylinder_status,
    SUM(cil.quantity) as total
FROM CYLINDER_LOCATION_INVENTORY cil
WHERE cil.cylinder_type_id = 7
GROUP BY cil.location_type, cil.cylinder_status
ORDER BY cil.location_type, cil.cylinder_status;
GO

PRINT 'Grand Total BEFORE:';
SELECT 
    'BEFORE' as state,
    SUM(quantity) as grand_total
FROM CYLINDER_LOCATION_INVENTORY 
WHERE cylinder_type_id = 7;
GO

-- Identify the artificial cylinders in YARD EMPTY
-- These were created by the buggy RETURN_EMPTY movements
PRINT 'Artificial cylinders to remove:';
SELECT 
    cil.quantity as artificial_empty_in_yard,
    cil.last_updated,
    CASE 
        WHEN cil.quantity > 58 THEN cil.quantity - 58
        ELSE 0
    END as excess_to_remove
FROM CYLINDER_LOCATION_INVENTORY cil
WHERE cil.cylinder_type_id = 7
  AND cil.location_type = 'YARD'
  AND cil.cylinder_status = 'EMPTY';
GO

-- Fix the artificial cylinders
-- WARNING: This will remove the excess cylinders that were created by the bug
PRINT 'Removing artificial cylinders...';

-- Update YARD EMPTY to the correct amount (should be 58 based on original data)
UPDATE CYLINDER_LOCATION_INVENTORY
SET quantity = 58,
    last_updated = GETDATE()
WHERE cylinder_type_id = 7
  AND location_type = 'YARD'
  AND cylinder_status = 'EMPTY';
GO

PRINT 'Artificial cylinders removed!';
GO

-- Show the corrected state
PRINT 'Corrected Inventory State (AFTER fix):';
SELECT 
    'AFTER' as state,
    cil.location_type,
    cil.cylinder_status,
    cil.location_reference_id,
    cil.quantity,
    cil.last_updated
FROM CYLINDER_LOCATION_INVENTORY cil
WHERE cil.cylinder_type_id = 7
ORDER BY cil.location_type, cil.cylinder_status, cil.location_reference_id;
GO

PRINT 'Corrected Totals (AFTER fix):';
SELECT 
    'AFTER' as state,
    cil.location_type,
    cil.cylinder_status,
    SUM(cil.quantity) as total
FROM CYLINDER_LOCATION_INVENTORY cil
WHERE cil.cylinder_type_id = 7
GROUP BY cil.location_type, cil.cylinder_status
ORDER BY cil.location_type, cil.cylinder_status;
GO

PRINT 'Grand Total AFTER:';
SELECT 
    'AFTER' as state,
    SUM(quantity) as grand_total
FROM CYLINDER_LOCATION_INVENTORY 
WHERE cylinder_type_id = 7;
GO

-- Log the fix
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
    7 as cylinder_type_id,
    'YARD' as from_location_type,
    'SYSTEM' as to_location_type,
    (SELECT quantity FROM CYLINDER_LOCATION_INVENTORY WHERE cylinder_type_id = 7 AND location_type = 'YARD' AND cylinder_status = 'EMPTY') - 58 as quantity,
    'BUG_FIX' as movement_type,
    NULL as reference_transaction_id,
    1 as moved_by,
    GETDATE() as movement_date,
    'Fixed artificial cylinders created by delivery bug - corrected YARD EMPTY quantity' as notes;
GO

PRINT '=====================================';
PRINT 'Bug fix completed!';
PRINT '';
PRINT 'Expected Results:';
PRINT '- YARD EMPTY should now be 58 (correct amount)';
PRINT '- Total cylinders should be back to ~361';
PRINT '- Future deliveries will work correctly';
PRINT '';
PRINT 'Test by creating a new delivery - total should remain stable!';
GO
