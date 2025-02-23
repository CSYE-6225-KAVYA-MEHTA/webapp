@echo off
for /f "tokens=1,* delims==" %%G in (.env) do (
    set %%G=%%H
)
packer build img-creation.pkr.hcl