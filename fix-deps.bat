@echo off
echo Fixing dependencies for TetraCryptPQC_Nexus...
echo Enforcing React 18.3.1 and cleaning up...

:: Remove node_modules and package-lock.json
rmdir /s /q node_modules
del package-lock.json

:: Clear npm cache
echo Clearing npm cache...
npm cache clean --force

:: Install fixed dependencies
echo Installing correct dependencies...
npm install react@18.3.1 react-dom@18.3.1 @types/react@18.3.18 @types/react-dom@18.3.5 --save
npm install --save-dev eslint jest rimraf glob vite @vitejs/plugin-react-swc tailwindcss postcss autoprefixer

:: Reinstall everything
echo Installing all dependencies...
npm install

:: Verify installation
echo Verifying React versions...
npm ls react
npm ls react-dom
npm ls @types/react
npm ls @types/react-dom

:: Build & test
echo Running build & tests...
npm run build
npm test

echo All dependencies are fixed. System is ready!
pause
