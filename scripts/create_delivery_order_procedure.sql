-- Create the missing stored procedure for delivery order creation
IF OBJECT_ID('dbo.sp_create_delivery_order', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_create_delivery_order;
GO

CREATE PROCEDURE dbo.sp_create_delivery_order
    @order_number VARCHAR(50),
    @customer_id INT,
    @location_id INT,
    @rate_contract_id INT,
    @order_date DATE,
    @requested_delivery_date DATE,
    @requested_delivery_time TIME = NULL,
    @priority VARCHAR(20),
    @special_instructions VARCHAR(500) = NULL,
    @created_by INT,
    @order_lines DeliveryOrderLineType READONLY
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @order_id INT;
    DECLARE @error_message NVARCHAR(4000);
    DECLARE @customer_name VARCHAR(100);
    DECLARE @customer_type VARCHAR(50);
    DECLARE @location_name VARCHAR(100);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Validate inputs
        IF @customer_id IS NULL OR @location_id IS NULL OR @rate_contract_id IS NULL
        BEGIN
            SET @error_message = 'Customer ID, Location ID, and Rate Contract ID are required';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Validate customer exists and get details
        SELECT @customer_name = CustomerName
        FROM CUSTOMER_MASTER
        WHERE CustomerId = @customer_id;
        
        IF @customer_name IS NULL
        BEGIN
            SET @error_message = 'Customer not found';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Set customer type (default to 'REGULAR' for now)
        SET @customer_type = 'REGULAR';
        
        -- Validate location exists and get name
        SELECT @location_name = LocationName
        FROM LOCATION_MASTER
        WHERE LocationId = @location_id;
        
        IF @location_name IS NULL
        BEGIN
            SET @error_message = 'Location not found';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Validate rate contract exists
        IF NOT EXISTS (SELECT 1 FROM RATE_CONTRACT_MASTER WHERE rate_contract_id = @rate_contract_id)
        BEGIN
            SET @error_message = 'Rate contract not found';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Validate order lines
        IF NOT EXISTS (SELECT 1 FROM @order_lines)
        BEGIN
            SET @error_message = 'At least one order line is required';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Check for duplicate order number
        IF EXISTS (SELECT 1 FROM DELIVERY_ORDER WHERE order_number = @order_number)
        BEGIN
            SET @error_message = 'Order number already exists';
            RAISERROR(@error_message, 16, 1);
        END
        
        -- Insert delivery order
        INSERT INTO DELIVERY_ORDER (
            order_number,
            customer_id,
            customer_name,
            customer_type,
            location_id,
            location_name,
            rate_contract_id,
            order_date,
            requested_delivery_date,
            requested_delivery_time,
            priority,
            special_instructions,
            order_status,
            created_by,
            created_at
        )
        VALUES (
            @order_number,
            @customer_id,
            @customer_name,
            @customer_type,
            @location_id,
            @location_name,
            @rate_contract_id,
            @order_date,
            @requested_delivery_date,
            @requested_delivery_time,
            @priority,
            @special_instructions,
            'PENDING',
            @created_by,
            GETDATE()
        );
        
        -- Get the generated order ID
        SET @order_id = SCOPE_IDENTITY();
        
        -- Insert order lines
        INSERT INTO DELIVERY_ORDER_LINE (
            order_id,
            cylinder_type_id,
            cylinder_description,
            ordered_qty,
            rate_applied,
            line_amount
        )
        SELECT 
            @order_id,
            cylinder_type_id,
            cylinder_description,
            ordered_qty,
            rate_applied,
            ordered_qty * rate_applied
        FROM @order_lines;
        
        -- Update order totals
        UPDATE DELIVERY_ORDER 
        SET total_ordered_qty = (
            SELECT ISNULL(SUM(ordered_qty), 0) 
            FROM DELIVERY_ORDER_LINE 
            WHERE order_id = @order_id
        )
        WHERE order_id = @order_id;
        
        COMMIT TRANSACTION;
        
        -- Return the order ID
        SELECT @order_id AS order_id;
        
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
GRANT EXECUTE ON dbo.sp_create_delivery_order TO [public];
GO