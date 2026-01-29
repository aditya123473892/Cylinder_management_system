-- Create a system user for development purposes
USE [Cylinder-Management];

-- Check if system user already exists
IF NOT EXISTS (SELECT * FROM [dbo].[USER_MASTER] WHERE [UserId] = 0)
BEGIN
    -- Insert system user
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
END;

-- Also create a default admin user with ID 1 if it doesn't exist
IF NOT EXISTS (SELECT * FROM [dbo].[USER_MASTER] WHERE [UserId] = 1)
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
        1,
        'admin',
        'admin@cylinder-management.com',
        'Admin',
        'User',
        1,
        GETDATE()
    );
    
    PRINT 'Admin user created with UserId = 1';
END
ELSE
BEGIN
    PRINT 'Admin user with UserId = 1 already exists';
END;

-- Show existing users
SELECT [UserId], [Username], [Email], [FirstName], [LastName], [IsActive]
FROM [dbo].[USER_MASTER]
ORDER BY [UserId];
