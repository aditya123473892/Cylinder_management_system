@echo off
for /f "tokens=*" %%i in (dirs.txt) do mkdir "%%i"
