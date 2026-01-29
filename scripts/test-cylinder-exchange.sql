-- Test Script for Cylinder Exchange Tracking System
-- This script validates the complete implementation

USE CylinderManagementSystem;
GO

-- Test 1: Verify all tables exist
PRINT '=== Testing Table Creation ===';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ORDER_EXCHANGE_TRACKING')
    PRINT '✓ ORDER_EXCHANGE_TRACKING table exists';
ELSE
    PRINT '✗ ORDER_EXCHANGE_TRACKING table missing';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DAILY_RECONCILIATION')
    PRINT '✓ DAILY_RECONCILIATION table exists';
ELSE
    PRINT '✗ DAILY_RECONCILIATION table missing';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'EXCHANGE_VARIANCE_DETAIL')
    PRINT '✓ EXCHANGE_VARIANCE_DETAIL table exists';
ELSE
    PRINT '✗ EXCHANGE_VARIANCE_DETAIL table missing';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'VEHICLE_END_OF_DAY_INVENTORY')
    PRINT '✓ VEHICLE_END_OF_DAY_INVENTORY table exists';
ELSE
    PRINT '✗ VEHICLE_END_OF_DAY_INVENTORY table missing';

-- Test 2: Verify stored procedures exist
PRINT '';
PRINT '=== Testing Stored Procedures ===';

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_count_vehicle_inventory')
    PRINT '✓ sp_count_vehicle_inventory procedure exists';
ELSE
    PRINT '✗ sp_count_vehicle_inventory procedure missing';

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_get_exchange_summary')
    PRINT '✓ sp_get_exchange_summary procedure exists';
ELSE
    PRINT '✗ sp_get_exchange_summary procedure missing';

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_get_exchange_variance_summary')
    PRINT '✓ sp_get_exchange_variance_summary procedure exists';
ELSE
    PRINT '✗ sp_get_exchange_variance_summary procedure missing';

-- Test 3: Verify triggers exist
PRINT '';
PRINT '=== Testing Triggers ===';

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_UPDATE_DAILY_RECONCILIATION_VALUES')
    PRINT '✓ TRG_UPDATE_DAILY_RECONCILIATION_VALUES trigger exists';
ELSE
    PRINT '✗ TRG_UPDATE_DAILY_RECONCILIATION_VALUES trigger missing';

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_UPDATE_EXCHANGE_VARIANCE_DETAILS')
    PRINT '✓ TRG_UPDATE_EXCHANGE_VARIANCE_DETAILS trigger exists';
ELSE
    PRINT '✗ TRG_UPDATE_EXCHANGE_VARIANCE_DETAILS trigger missing';

-- Test 4: Test data insertion and validation
PRINT '';
PRINT '=== Testing Data Operations ===';

-- Create test data for testing
DECLARE @TestOrderId INT = 1;
DECLARE @TestPlanId INT = 1;
DECLARE @TestCustomerId INT = 1;
DECLARE @TestCylinderTypeId INT = 1;

-- Test inserting exchange tracking record
BEGIN TRY
    INSERT INTO ORDER_EXCHANGE_TRACKING (
        order_id, filled_delivered, empty_collected, expected_empty,
        variance_qty, variance_type, customer_acknowledged, notes
    ) VALUES (
        @TestOrderId, 10, 8, 10, -2, 'SHORTAGE', 1, 'Test exchange record'
    );
    PRINT '✓ Exchange tracking record inserted successfully';
END TRY
BEGIN CATCH
    PRINT '✗ Failed to insert exchange tracking record: ' + ERROR_MESSAGE();
END CATCH;

-- Test inserting daily reconciliation record
BEGIN TRY
    INSERT INTO DAILY_RECONCILIATION (
        plan_id, reconciliation_date, reconciliation_time, reconciled_by, status
    ) VALUES (
        @TestPlanId, GETDATE(), CAST(GETDATE() AS TIME), 1, 'PENDING'
    );
    PRINT '✓ Daily reconciliation record inserted successfully';
END TRY
BEGIN CATCH
    PRINT '✗ Failed to insert daily reconciliation record: ' + ERROR_MESSAGE();
END CATCH;

-- Test inserting vehicle inventory record
BEGIN TRY
    INSERT INTO VEHICLE_END_OF_DAY_INVENTORY (
        plan_id, cylinder_type_id, cylinder_description, expected_remaining,
        actual_remaining, variance, counted_by
    ) VALUES (
        @TestPlanId, @TestCylinderTypeId, 'Test Cylinder', 5, 4, -1, 1
    );
    PRINT '✓ Vehicle inventory record inserted successfully';
END TRY
BEGIN CATCH
    PRINT '✗ Failed to insert vehicle inventory record: ' + ERROR_MESSAGE();
END CATCH;

-- Test 5: Test stored procedure execution
PRINT '';
PRINT '=== Testing Stored Procedures Execution ===';

BEGIN TRY
    -- Test exchange summary procedure
    EXEC sp_get_exchange_summary @TestPlanId;
    PRINT '✓ sp_get_exchange_summary executed successfully';
END TRY
BEGIN CATCH
    PRINT '✗ Failed to execute sp_get_exchange_summary: ' + ERROR_MESSAGE();
END CATCH;

BEGIN TRY
    -- Test variance summary procedure
    EXEC sp_get_exchange_variance_summary @TestPlanId;
    PRINT '✓ sp_get_exchange_variance_summary executed successfully';
END TRY
BEGIN CATCH
    PRINT '✗ Failed to execute sp_get_exchange_variance_summary: ' + ERROR_MESSAGE();
END CATCH;

-- Test 6: Test trigger functionality
PRINT '';
PRINT '=== Testing Trigger Functionality ===';

-- Insert another exchange to test trigger
BEGIN TRY
    INSERT INTO ORDER_EXCHANGE_TRACKING (
        order_id, filled_delivered, empty_collected, expected_empty,
        variance_qty, variance_type, customer_acknowledged, notes
    ) VALUES (
        @TestOrderId, 5, 6, 5, 1, 'EXCESS', 1, 'Test excess exchange'
    );
    PRINT '✓ Second exchange record inserted - testing trigger';
END TRY
BEGIN CATCH
    PRINT '✗ Failed to insert second exchange record: ' + ERROR_MESSAGE();
END CATCH;

-- Check if reconciliation values were updated by trigger
BEGIN TRY
    DECLARE @UpdatedShortages INT, @UpdatedExcess INT;
    SELECT @UpdatedShortages = total_shortages, @UpdatedExcess = total_excess
    FROM DAILY_RECONCILIATION
    WHERE plan_id = @TestPlanId;

    IF @UpdatedShortages IS NOT NULL OR @UpdatedExcess IS NOT NULL
        PRINT '✓ Trigger updated reconciliation values';
    ELSE
        PRINT '✗ Trigger did not update reconciliation values';
END TRY
BEGIN CATCH
    PRINT '✗ Failed to check trigger functionality: ' + ERROR_MESSAGE();
END CATCH;

-- Test 7: Test data integrity constraints
PRINT '';
PRINT '=== Testing Data Integrity ===';

-- Test foreign key constraints
BEGIN TRY
    INSERT INTO ORDER_EXCHANGE_TRACKING (
        order_id, filled_delivered, empty_collected, expected_empty,
        variance_qty, variance_type, customer_acknowledged, notes
    ) VALUES (
        999999, 10, 8, 10, -2, 'SHORTAGE', 1, 'Test invalid order_id'
    );
    PRINT '✗ Foreign key constraint not enforced';
END TRY
BEGIN CATCH
    PRINT '✓ Foreign key constraint properly enforced';
END CATCH;

-- Test check constraints
BEGIN TRY
    INSERT INTO ORDER_EXCHANGE_TRACKING (
        order_id, filled_delivered, empty_collected, expected_empty,
        variance_qty, variance_type, customer_acknowledged, notes
    ) VALUES (
        @TestOrderId, 10, 8, 10, -2, 'INVALID_TYPE', 1, 'Test invalid variance type'
    );
    PRINT '✗ Check constraint not enforced for variance_type';
END TRY
BEGIN CATCH
    PRINT '✓ Check constraint properly enforced for variance_type';
END CATCH;

-- Test 8: Test views (if any exist)
PRINT '';
PRINT '=== Testing Views ===';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_exchange_tracking_with_order')
    PRINT '✓ vw_exchange_tracking_with_order view exists';
ELSE
    PRINT '✗ vw_exchange_tracking_with_order view missing';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_daily_reconciliation_with_details')
    PRINT '✓ vw_daily_reconciliation_with_details view exists';
ELSE
    PRINT '✗ vw_daily_reconciliation_with_details view missing';

-- Test 9: Clean up test data
PRINT '';
PRINT '=== Cleaning Up Test Data ===';

BEGIN TRY
    DELETE FROM VEHICLE_END_OF_DAY_INVENTORY WHERE plan_id = @TestPlanId AND cylinder_type_id = @TestCylinderTypeId;
    DELETE FROM EXCHANGE_VARIANCE_DETAIL WHERE reconciliation_id IN (SELECT reconciliation_id FROM DAILY_RECONCILIATION WHERE plan_id = @TestPlanId);
    DELETE FROM DAILY_RECONCILIATION WHERE plan_id = @TestPlanId;
    DELETE FROM ORDER_EXCHANGE_TRACKING WHERE order_id = @TestOrderId AND notes LIKE 'Test%';
    PRINT '✓ Test data cleaned up successfully';
END TRY
BEGIN CATCH
    PRINT '✗ Failed to clean up test data: ' + ERROR_MESSAGE();
END CATCH;

PRINT '';
PRINT '=== Test Summary ===';
PRINT 'Cylinder Exchange Tracking System validation complete.';
PRINT 'Please review the results above for any issues.';