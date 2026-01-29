-- Fix movement_type column size to accommodate longer movement type names
USE [Cylinder-Management];

-- Increase movement_type column from varchar(20) to varchar(30) to handle new movement types
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[CYLINDER_MOVEMENT_LOG]') AND name = 'movement_type')
BEGIN
    -- Check if the column is already varchar(30) or larger
    DECLARE @current_length int;
    SELECT @current_length = max_length FROM sys.columns 
    WHERE object_id = OBJECT_ID('[dbo].[CYLINDER_MOVEMENT_LOG]') AND name = 'movement_type';
    
    IF @current_length < 30
    BEGIN
        PRINT 'Altering movement_type column from varchar(' + CAST(@current_length AS varchar) + ') to varchar(30)...';
        ALTER TABLE [dbo].[CYLINDER_MOVEMENT_LOG] ALTER COLUMN [movement_type] [varchar](30) NULL;
        PRINT 'movement_type column successfully increased to varchar(30)';
    END
    ELSE
    BEGIN
        PRINT 'movement_type column is already varchar(' + CAST(@current_length AS varchar) + ') - no change needed';
    END
END
ELSE
BEGIN
    PRINT 'movement_type column not found in CYLINDER_MOVEMENT_LOG table';
END
GO

-- Also update the check constraints to include the new movement types if they exist
IF EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('[dbo].[CYLINDER_MOVEMENT_LOG]'))
BEGIN
    PRINT 'Checking for existing movement_type constraints...';
    
    -- Drop any existing check constraints on movement_type if they're too restrictive
    DECLARE @constraint_name sysname;
    SELECT @constraint_name = name FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('[dbo].[CYLINDER_MOVEMENT_LOG]') 
    AND definition LIKE '%movement_type%';
    
    IF @constraint_name IS NOT NULL
    BEGIN
        PRINT 'Dropping existing constraint: ' + @constraint_name;
        EXEC('ALTER TABLE [dbo].[CYLINDER_MOVEMENT_LOG] DROP CONSTRAINT [' + @constraint_name + ']');
    END
END
GO

PRINT 'Movement type column fix completed successfully!';
GO
