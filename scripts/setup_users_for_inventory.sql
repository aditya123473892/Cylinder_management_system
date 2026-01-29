-- Check and create necessary users for inventory initialization
USE [Cylinder-Management];

-- Check if user table exists and show current users
IF EXISTS (SELECT * FROM sysobjects WHERE name='USER_MASTER' AND xtype='U')
BEGIN
    PRINT 'USER_MASTER table exists. Current users:';
    SELECT [UserId], [Username], [Email], [FirstName], [LastName], [IsActive], [CreatedDate]
    FROM [dbo].[USER_MASTER]
    ORDER BY [UserId];
END
ELSE
BEGIN
    PRINT 'USER_MASTER table does not exist!';
END

-- Create system user with ID 0 if it doesn't exist
IF NOT EXISTS (SELECT * FROM [dbo].[USER_MASTER] WHERE [UserId] = 0)
BEGIN
    INSERT INTO [dbo].[USER_MASTER] (
        [UserId],
        [Username],
        [Email],
        [FirstName],
        [LastName],
        [IsActive],
        [CreatedDate]
    ) VALUES (
        0,
        'system',
        'system@cylinder-management.com',
        'System',
        'User',
        1,
        GETDATE()
    );
    
    PRINT 'System user created with UserId = 0';
END
ELSE
BEGIN
    PRINT 'System user with UserId = 0 already exists';
END

-- Create admin user with ID 1 if it doesn't exist
IF NOT EXISTS (SELECT * FROM [dbo].[USER_MASTER] WHERE [UserId] = 1)
BEGIN
    INSERT INTO [dbo].[USER_MASTER] (
        [UserId],
        [Username],
        [Email],
        [PasswordHash],
        [FirstName],
        [LastName],
        [Role],
        [IsActive],
        [CreatedDate]
    ) VALUES (
        1,
        'admin',
        'admin@cylinder-management.com',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5e', -- password: admin123
        'Admin',
        'User',
        'ADMIN',
        1,
        GETDATE()
    );
    
    PRINT 'Admin user created with UserId = 1 (password: admin123)';
END
ELSE
BEGIN
    PRINT 'Admin user with UserId = 1 already exists';
END

PRINT 'User setup completed!';
