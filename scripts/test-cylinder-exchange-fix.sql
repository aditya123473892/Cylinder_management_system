-- Test script to verify cylinder exchange tables and triggers are working correctly
USE [Cylinder-Management];

-- Test 1: Verify tables exist
PRINT '=== Testing Table Creation ===';

IF EXISTS (SELECT * FROM sysobjects WHERE name='ORDER_EXCHANGE_TRACKING' AND xtype='U')
    PRINT '✓ ORDER_EXCHANGE_TRACKING table exists';
ELSE
    PRINT '✗ ORDER_EXCHANGE_TRACKING table missing';

IF EXISTS (SELECT * FROM sysobjects WHERE name='DAILY_RECONCILIATION' AND xtype='U')
    PRINT '✓ DAILY_RECONCILIATION table exists';
ELSE
    PRINT '✗ DAILY_RECONCILIATION table missing';

IF EXISTS (SELECT * FROM sysobjects WHERE name='EXCHANGE_VARIANCE_DETAIL' AND xtype='U')
    PRINT '✓ EXCHANGE_VARIANCE_DETAIL table exists';
ELSE
    PRINT '✗ EXCHANGE_VARIANCE_DETAIL table missing';

IF EXISTS (SELECT * FROM sysobjects WHERE name='VEHICLE_END_OF_DAY_INVENTORY' AND xtype='U')
    PRINT '✓ VEHICLE_END_OF_DAY_INVENTORY table exists';
ELSE
    PRINT '✗ VEHICLE_END_OF_DAY_INVENTORY table missing';

-- Test 2: Verify triggers exist
PRINT '';
PRINT '=== Testing Trigger Creation ===';

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_UPDATE_DELIVERY_PLAN_EXCHANGE_TOTALS')
    PRINT '✓ TRG_UPDATE_DELIVERY_PLAN_EXCHANGE_TOTALS trigger exists';
ELSE
    PRINT '✗ TRG_UPDATE_DELIVERY_PLAN_EXCHANGE_TOTALS trigger missing';

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_UPDATE_DAILY_RECONCILIATION_VALUES')
    PRINT '✓ TRG_UPDATE_DAILY_RECONCILIATION_VALUES trigger exists';
ELSE
    PRINT '✗ TRG_UPDATE_DAILY_RECONCILIATION_VALUES trigger missing';

-- Test 3: Test basic insert into ORDER_EXCHANGE_TRACKING (should trigger both triggers)
PRINT '';
PRINT '=== Testing Trigger Functionality ===';

-- Create a test delivery plan if none exists (using minimal required columns)
IF NOT EXISTS (SELECT * FROM DELIVERY_PLAN WHERE plan_id = 999999)
BEGIN
    INSERT INTO DELIVERY_PLAN (plan_date, vehicle_id, driver_id, created_by, dispatch_date, exchange_type)
    VALUES (GETDATE(), 1, 1, 1, GETDATE(), 'ORDER_BASED');
END

-- Create a test delivery order if none exists (using minimal required columns)
IF NOT EXISTS (SELECT * FROM DELIVERY_ORDER WHERE order_id = 999999)
BEGIN
    INSERT INTO DELIVERY_ORDER (customer_id, order_date, created_by)
    VALUES (1, GETDATE(), 1);
END

-- Link the order to the plan if not already linked
IF NOT EXISTS (SELECT * FROM DELIVERY_PLAN_ORDER WHERE plan_id = 999999 AND order_id = 999999)
BEGIN
    INSERT INTO DELIVERY_PLAN_ORDER (plan_id, order_id)
    VALUES (999999, 999999);
END

-- Test insert into ORDER_EXCHANGE_TRACKING (this should trigger both triggers)
BEGIN TRY
    INSERT INTO ORDER_EXCHANGE_TRACKING 
    (order_id, filled_delivered, empty_collected, expected_empty, variance_qty, variance_type)
    VALUES (999999, 10, 8, 10, -2, 'SHORTAGE');
    
    PRINT '✓ ORDER_EXCHANGE_TRACKING insert successful - triggers executed';
    
    -- Check if delivery plan totals were updated
    DECLARE @total_shortages INT;
    SELECT @total_shortages = total_shortages FROM DELIVERY_PLAN WHERE plan_id = 999999;
    
    IF @total_shortages > 0
        PRINT '✓ TRG_UPDATE_DELIVERY_PLAN_EXCHANGE_TOTALS working correctly';
    ELSE
        PRINT '✗ TRG_UPDATE_DELIVERY_PLAN_EXCHANGE_TOTALS not updating totals';
    
    -- Check if daily reconciliation was updated (if it exists)
    IF EXISTS (SELECT * FROM DAILY_RECONCILIATION WHERE plan_id = 999999)
    BEGIN
        DECLARE @recon_shortages INT;
        SELECT @recon_shortages = total_shortages FROM DAILY_RECONCILIATION WHERE plan_id = 999999;
        
        IF @recon_shortages > 0
            PRINT '✓ TRG_UPDATE_DAILY_RECONCILIATION_VALUES working correctly';
        ELSE
            PRINT '✗ TRG_UPDATE_DAILY_RECONCILIATION_VALUES not updating totals';
    END
    ELSE
        PRINT 'ℹ No daily reconciliation record found for testing';
        
END TRY
BEGIN CATCH
    PRINT '✗ Error during ORDER_EXCHANGE_TRACKING insert: ' + ERROR_MESSAGE();
END CATCH

-- Test 4: Clean up test data
PRINT '';
PRINT '=== Cleaning Up Test Data ===';

DELETE FROM ORDER_EXCHANGE_TRACKING WHERE order_id = 999999;
DELETE FROM DELIVERY_PLAN_ORDER WHERE plan_id = 999999 AND order_id = 999999;
DELETE FROM DELIVERY_ORDER WHERE order_id = 999999;
DELETE FROM DELIVERY_PLAN WHERE plan_id = 999999;

PRINT '✓ Test data cleaned up';

PRINT '';
PRINT '=== Test Complete ===';
GO