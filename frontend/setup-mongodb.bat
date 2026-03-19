@echo off
echo ========================================
echo MongoDB Connection Setup
echo ========================================
echo.
echo Please enter your MongoDB password:
set /p PASSWORD="Password: "
echo.
echo Creating .env.local file...
echo.
(
echo MONGODB_URI=mongodb+srv://asd:%PASSWORD%@<your-cluster-url>.mongodb.net/Digital_Wardrobe?retryWrites=true^&w=majority^&appName=Cluster0
echo DATABASE_URL=mongodb+srv://asd:%PASSWORD%@<your-cluster-url>.mongodb.net/Digital_Wardrobe?retryWrites=true^&w=majority^&appName=Cluster0
echo PORT=3000
) > .env.local
echo.
echo .env.local file created successfully!
echo.
echo IMPORTANT: If your password contains special characters (@, #, %%, etc.),
echo you may need to URL-encode them manually in the .env.local file.
echo.
echo Next steps:
echo 1. Restart your server: npm run dev
echo 2. Check for "MongoDB Connected" message
echo.
pause
