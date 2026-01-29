-- Create the missing stored procedure for assigning orders to delivery plan
IF OBJECT_ID('dbo.sp_assign_orders_to_plan', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_assign_orders_to_plan;
GO

-- Create the table type first if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.types WHERE is_table_type = 1 AND name = 'DeliveryPlanOrderType')
BEGIN
    CREATE TYPE DeliveryPlanOrderType AS TABLE (
        order_id BIGINT,
        sequence_number INT,
        planned_delivery_time TIME
    );
END
GO

CREATE PROCEDURE dbo.sp_assign_orders_to_plan
    @plan_id BIGINT,
    @plan_orders DeliveryPlanOrderType READONLY
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @error_message NVARCHAR(4000);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate inputs
        IF @plan_id IS NULL
        BEGIN
            SET @error_message = 'Plan ID is required';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Validate plan exists
        IF NOT EXISTS (SELECT 1 FROM DELIVERY_PLAN WHERE plan_id = @plan_id)
        BEGIN
            SET @error_message = 'Delivery plan not found';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Validate plan orders
        IF NOT EXISTS (SELECT 1 FROM @plan_orders)
        BEGIN
            SET @error_message = 'At least one order is required';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Validate all orders exist and are in correct status
        IF EXISTS (
            SELECT 1 FROM @plan_orders po
            LEFT JOIN DELIVERY_ORDER DO ON po.order_id = DO.order_id
            WHERE DO.order_id IS NULL OR DO.order_status NOT IN ('PENDING', 'CONFIRMED')
        )
        BEGIN
            SET @error_message = 'One or more orders not found or not in plannable status';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Check for duplicate orders
        IF EXISTS (
            SELECT order_id FROM @plan_orders
            GROUP BY order_id
            HAVING COUNT(*) > 1
        )
        BEGIN
            SET @error_message = 'Duplicate orders found in the request';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Check if orders are already assigned to another plan
        IF EXISTS (
            SELECT 1 FROM @plan_orders po
            INNER JOIN DELIVERY_PLAN_ORDER DPO ON po.order_id = DPO.order_id
            WHERE DPO.plan_id != @plan_id
        )
        BEGIN
            SET @error_message = 'One or more orders are already assigned to another plan';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Remove existing assignments for this plan (if any)
        DELETE FROM DELIVERY_PLAN_ORDER WHERE plan_id = @plan_id;
        
        -- Insert new plan order assignments
        INSERT INTO DELIVERY_PLAN_ORDER (
            plan_id,
            order_id,
            sequence_number,
            planned_delivery_time
        )
        SELECT 
            @plan_id,
            order_id,
            sequence_number,
            planned_delivery_time
        FROM @plan_orders
        ORDER BY sequence_number;
        
        -- Update order statuses to ASSIGNED
        UPDATE DELIVERY_ORDER 
        SET order_status = 'ASSIGNED',
            updated_at = GETDATE()
        WHERE order_id IN (SELECT order_id FROM @plan_orders);
        
        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        -- Re-throw the error
        THROW;
    END CATCH
END
GO

-- Grant execute permissions
GRANT EXECUTE ON dbo.sp_assign_orders_to_plan TO [public];
GO
